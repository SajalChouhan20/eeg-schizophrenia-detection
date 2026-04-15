# ============================================
# EEG Schizophrenia Detection (SIMPLIFIED SVM)
# ============================================

import os
import numpy as np
import mne
from scipy.signal import welch
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib

DATA_PATH = "../dataverse_files"

# EEG frequency bands
FREQ_BANDS = {
    "delta": (0.5, 4),
    "theta": (4, 8),
    "alpha": (8, 13),
    "beta": (13, 30),
    "gamma": (30, 45),
}

N_CHANNELS = 19


def compute_band_powers(signal, sfreq):
    nperseg = min(int(2 * sfreq), len(signal))
    freqs, psd = welch(signal, fs=sfreq, nperseg=nperseg)

    total_power = np.trapezoid(psd, freqs)
    band_powers = []

    for (low, high) in FREQ_BANDS.values():
        idx = np.logical_and(freqs >= low, freqs <= high)
        band_power = np.trapezoid(psd[idx], freqs[idx])
        rel_power = band_power / total_power if total_power > 0 else 0
        band_powers.append(rel_power)

    return band_powers


def extract_features(file_path):
    try:
        raw = mne.io.read_raw_edf(file_path, preload=True, verbose=False)
        data = raw.get_data()
        sfreq = raw.info["sfreq"]

        # Standardize channel count
        if data.shape[0] >= N_CHANNELS:
            data = data[:N_CHANNELS]
        else:
            padding = np.zeros((N_CHANNELS - data.shape[0], data.shape[1]))
            data = np.vstack([data, padding])

        features = []

        for ch in data:
            # Statistical features
            mean = np.mean(ch)
            std = np.std(ch)

            skew = np.mean(((ch - mean) / (std + 1e-10)) ** 3)
            kurt = np.mean(((ch - mean) / (std + 1e-10)) ** 4)

            features.extend([mean, std, skew, kurt])

            # Spectral features
            features.extend(compute_band_powers(ch, sfreq))

        # Correlation features
        corr_matrix = np.corrcoef(data)
        upper_tri = corr_matrix[np.triu_indices(N_CHANNELS, k=1)]

        features.append(np.mean(upper_tri))
        features.append(np.std(upper_tri))
        features.append(np.median(upper_tri))

        return features

    except:
        return None


# Load dataset
X, y = [], []

for file in os.listdir(DATA_PATH):
    if not file.endswith(".edf"):
        continue

    path = os.path.join(DATA_PATH, file)
    features = extract_features(path)

    if features is None:
        continue

    label = 0 if file.lower().startswith("h") else 1

    X.append(features)
    y.append(label)


X = np.array(X)
y = np.array(y)

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# Your original SVM model
model = make_pipeline(
    StandardScaler(),
    SVC(
        kernel='rbf',
        C=10,
        gamma='scale',
        class_weight='balanced'
    )
)

model.fit(X_train, y_train)

# Prediction
y_pred = model.predict(X_test)

# ============================================
# EVALUATION
# ============================================
print("\nAccuracy:", accuracy_score(y_test, y_pred))

print("\nClassification Report:")
print(classification_report(y_test, y_pred))

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))


# Sample Predictions
print("\nSample Predictions:")
for i in range(min(10, len(X_test))):
    print("Actual:", y_test[i], "Predicted:", y_pred[i])

# Save model
joblib.dump(model, "svm_model.pkl")
