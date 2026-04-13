from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import mne
import os

app = Flask(__name__)
CORS(app)

# 🔥 LOAD RANDOM FOREST MODEL
model = joblib.load("svm_model.pkl")

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def extract_features(file_path):
    try:
        raw = mne.io.read_raw_edf(file_path, preload=True, verbose=False)
        data = raw.get_data()

        features = []

        for ch in data:
            features.append(np.mean(ch))
            features.append(np.std(ch))

        return features

    except Exception as e:
        print("Error:", e)
        return None


@app.route("/predict", methods=["POST"])
def predict():

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"})

    file = request.files["file"]

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    features = extract_features(file_path)

    os.remove(file_path)

    if features is None:
        return jsonify({"error": "Invalid EEG file"})

    prediction = model.predict([features])[0]

    result = "🧠 Schizophrenia Detected" if prediction == 1 else "✅ Healthy"

    return jsonify({"prediction": result})


if __name__ == "__main__":
    app.run(debug=True)