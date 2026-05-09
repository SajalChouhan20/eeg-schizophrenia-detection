from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import mne
import os
from scipy.signal import welch
import warnings

warnings.filterwarnings("ignore")

app = Flask(__name__)
CORS(app)

# Load trained model
model = joblib.load("svm_model.pkl")

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# EEG frequency bands (Hz) — must match train_model.py
FREQ_BANDS = {
    "delta": (0.5, 4),
    "theta": (4, 8),
    "alpha": (8, 13),
    "beta": (13, 30),
    "gamma": (30, 45),
}

N_CHANNELS = 19  # must match train_model.py


def compute_band_powers(signal, sfreq):
    """Compute power in each EEG frequency band using Welch's method."""
    nperseg = min(int(2 * sfreq), len(signal))
    freqs, psd = welch(signal, fs=sfreq, nperseg=nperseg)

    band_powers = []
    total_power = np.trapz(psd, freqs)

    for band_name, (low, high) in FREQ_BANDS.items():
        idx = np.logical_and(freqs >= low, freqs <= high)
        band_power = np.trapz(psd[idx], freqs[idx])
        rel_power = band_power / total_power if total_power > 0 else 0
        band_powers.append(rel_power)

    return band_powers


def extract_features(file_path):
    """Extract features — must match train_model.py exactly."""
    try:
        raw = mne.io.read_raw_edf(file_path, preload=True, verbose=False)
        data = np.array(raw.get_data())
        sfreq = raw.info["sfreq"]
        n_channels_available = data.shape[0]

        if n_channels_available >= N_CHANNELS:
            data = data[:N_CHANNELS]
        else:
            padding = np.zeros((N_CHANNELS - n_channels_available, data.shape[1]))
            data = np.vstack([data, padding])

        features = []

        for ch_idx in range(N_CHANNELS):
            ch = data[ch_idx]

            features.append(np.mean(ch))
            features.append(np.std(ch))
            features.append(float(np.mean(((ch - np.mean(ch)) / (np.std(ch) + 1e-10)) ** 3)))
            features.append(float(np.mean(((ch - np.mean(ch)) / (np.std(ch) + 1e-10)) ** 4)))

            band_powers = compute_band_powers(ch, sfreq)
            features.extend(band_powers)

        if N_CHANNELS > 1:
            corr_matrix = np.corrcoef(data)
            upper_tri = corr_matrix[np.triu_indices(N_CHANNELS, k=1)]
            features.append(np.mean(upper_tri))
            features.append(np.std(upper_tri))
            features.append(np.median(upper_tri))
        else:
            features.extend([0, 0, 0])

        return features

    except Exception as e:
        print("Error:", e)
        return None


@app.route("/predict", methods=["POST"])
def predict():

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"})

    file = request.files["file"]

    if file.filename is None or file.filename == "":
        return jsonify({"error": "Invalid filename"})

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    features = extract_features(file_path)

    os.remove(file_path)

    if features is None:
        return jsonify({"error": "Invalid EEG file"})

    prediction = model.predict([features])[0]

    # Try to estimate schizophrenia probability from the trained model.
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba([features])[0]
        classes = list(model.classes_) if hasattr(model, "classes_") else [0, 1]
        try:
            schiz_index = classes.index(1)
            schizophrenia_percentage = float(probs[schiz_index] * 100)
        except ValueError:
            schizophrenia_percentage = float(np.max(probs) * 100)
    elif hasattr(model, "decision_function"):
        score = float(model.decision_function([features])[0])
        schizophrenia_percentage = float((1.0 / (1.0 + np.exp(-score))) * 100)
    else:
        schizophrenia_percentage = 100.0 if prediction == 1 else 0.0

    result = "🧠 Schizophrenia Detected" if prediction == 1 else "✅ Healthy"

    return jsonify({
        "prediction": result,
        "schizophrenia_percentage": round(schizophrenia_percentage, 2)
    })


if __name__ == "__main__":
    app.run(debug=True)
