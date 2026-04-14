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