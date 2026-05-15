# ============================================
# EEG Schizophrenia Detection (174-feature SVM)
# ============================================

import os
import numpy as np
import mne
from scipy import stats
from scipy.signal import welch
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib

DATA_PATH = "../dataverse_files"

STANDARD_CHANNELS = [
    "Fp1", "Fp2", "F3", "F4", "C3", "C4", "P3", "P4",
    "O1", "O2", "F7", "F8", "T3", "T4", "T5", "T6",
    "Fz", "Cz", "Pz",
]

N_CHANNELS = 19

FREQ_BANDS = {
    "delta": (0.5, 4.0),
    "theta": (4.0, 8.0),
    "alpha": (8.0, 13.0),
    "beta": (13.0, 30.0),
    "gamma": (30.0, 45.0),
}


def _load_edf_channels(file_path):
    """Load EDF and return exactly 19 channels of data plus sampling rate."""
    raw = mne.io.read_raw_edf(file_path, preload=True, verbose=False)
    data = raw.get_data()
    sfreq = float(raw.info["sfreq"])

    if data.shape[0] >= N_CHANNELS:
        data = data[:N_CHANNELS]
    else:
        padding = np.zeros((N_CHANNELS - data.shape[0], data.shape[1]))
        data = np.vstack([data, padding])

    return data, sfreq


def _channel_band_powers(ch_data, sfreq):
    """Relative band powers for one channel (5 values, sum ~ 1.0)."""
    nperseg = min(int(2 * sfreq), len(ch_data))
    if nperseg < 2:
        return {band: 0.0 for band in FREQ_BANDS}

    freqs, psd = welch(ch_data, fs=sfreq, nperseg=nperseg)
    total_power = float(np.trapezoid(psd, freqs))
    powers = {}

    for band_name, (f_low, f_high) in FREQ_BANDS.items():
        idx_band = np.logical_and(freqs >= f_low, freqs <= f_high)
        if np.any(idx_band) and total_power > 0:
            band_power = float(np.trapezoid(psd[idx_band], freqs[idx_band]))
            powers[band_name] = band_power / total_power
        else:
            powers[band_name] = 0.0

    return powers


def extract_eeg_data(file_path):
    """Single-pass extraction: 174 features, 38 model features, visualization data."""
    try:
        data, sfreq = _load_edf_channels(file_path)

        features_174 = []
        model_features = []
        channel_features = []
        per_channel_bands = {band: [] for band in FREQ_BANDS}

        for i, ch_data in enumerate(data):
            mean_val = float(np.mean(ch_data))
            std_val = float(np.std(ch_data))
            skew_val = float(stats.skew(ch_data))
            kurt_val = float(stats.kurtosis(ch_data))

            features_174.extend([mean_val, std_val, skew_val, kurt_val])
            model_features.extend([mean_val, std_val])

            channel_features.append({
                "channel": STANDARD_CHANNELS[i],
                "mean": mean_val,
                "std": std_val,
                "skewness": skew_val,
                "kurtosis": kurt_val,
            })

            ch_bands = _channel_band_powers(ch_data, sfreq)
            for band_name, rel_power in ch_bands.items():
                features_174.append(float(rel_power))
                per_channel_bands[band_name].append(float(rel_power))

        corr_matrix = np.corrcoef(data)
        upper_tri = corr_matrix[np.triu_indices(N_CHANNELS, k=1)]
        corr_mean = float(np.mean(upper_tri))
        corr_std = float(np.std(upper_tri))
        corr_median = float(np.median(upper_tri))
        features_174.extend([corr_mean, corr_std, corr_median])

        band_powers = {
            band: round(float(np.mean(per_channel_bands[band])), 4)
            for band in FREQ_BANDS
        }

        total_rel = sum(band_powers.values())
        band_powers_pct = {}
        if total_rel > 0:
            for band_name, power in band_powers.items():
                band_powers_pct[band_name] = round((power / total_rel) * 100, 2)
        else:
            band_powers_pct = {b: 0.0 for b in FREQ_BANDS}

        return {
            "features_174": features_174,
            "model_features": model_features,
            "channel_features": channel_features,
            "band_powers": band_powers,
            "band_powers_pct": band_powers_pct,
            "num_channels": N_CHANNELS,
            "sampling_rate": sfreq,
            "channel_names": STANDARD_CHANNELS,
        }

    except Exception as e:
        import traceback
        print("FEATURE EXTRACTION ERROR:", str(e))
        traceback.print_exc()
        return None


X, y = [], []

# ============================================
# LOAD DATASET
# ============================================
for file in os.listdir(DATA_PATH):

    if not file.endswith(".edf"):
        continue

    path = os.path.join(DATA_PATH, file)
    extraction = extract_eeg_data(path)

    if extraction is None:
        continue

    features = extraction["features_174"]

    if file.lower().startswith("h"):
        label = 0   # Healthy
    elif file.lower().startswith("s"):
        label = 1   # Schizophrenia
    else:
        continue

    X.append(features)
    y.append(label)


X = np.array(X)
y = np.array(y)

print("Total samples:", len(X))
print("Features per sample:", X.shape[1] if len(X) else 0)
print("Label distribution:", np.bincount(y))


# ============================================
# STRATIFIED TRAIN-TEST SPLIT
# ============================================
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y,
)

print("\nTrain distribution:", np.bincount(y_train))
print("Test distribution:", np.bincount(y_test))


# ============================================
# MODEL (PIPELINE)
# ============================================
model = make_pipeline(
    StandardScaler(),
    SVC(
        kernel="rbf",
        C=10,
        gamma="scale",
        class_weight="balanced",
    ),
)


# ============================================
# TRAINING
# ============================================
model.fit(X_train, y_train)


# ============================================
# PREDICTION
# ============================================
y_pred = model.predict(X_test)


# ============================================
# EVALUATION
# ============================================
print("\nAccuracy:", accuracy_score(y_test, y_pred))

print("\nClassification Report:")
print(classification_report(y_test, y_pred))

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))

print("\nModel expects features:", model.named_steps["standardscaler"].n_features_in_)


# ============================================
# SAVE MODEL
# ============================================
joblib.dump(model, "svm_model.pkl")

print("\nModel saved as svm_model.pkl")
