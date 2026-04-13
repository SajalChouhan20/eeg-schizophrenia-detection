# ============================================
# EEG Schizophrenia Detection (SVM VERSION)
# ============================================

import os
import numpy as np
import mne
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score
import joblib

DATA_PATH = "../dataverse_files"

X, y = [], []

# 🔥 FEATURE EXTRACTION (same as yours)
def extract_features(file_path):
    try:
        raw = mne.io.read_raw_edf(file_path, preload=True, verbose=False)
        data = raw.get_data()

        features = []

        # Channel-wise features
        for ch in data:
            features.append(np.mean(ch))
            features.append(np.std(ch))

        return features

    except Exception as e:
        print("Skipping:", file_path, e)
        return None


# Load dataset
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

print("Total samples:", len(X))
print("Label distribution:", np.bincount(y))  # DEBUG

# Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# 🔥 SVM MODEL (FIXED VERSION)
model = make_pipeline(
    StandardScaler(),  # IMPORTANT
    SVC(
        kernel='rbf',
        C=10,
        gamma='scale',
        class_weight='balanced'  # IMPORTANT
    )
)

model.fit(X_train, y_train)

# Predictions
y_pred = model.predict(X_test)

print("Accuracy:", accuracy_score(y_test, y_pred))

print("\nSample Predictions:")
for i in range(len(X_test)):
    print("Actual:", y_test[i], "Predicted:", y_pred[i])

# Save model
joblib.dump(model, "svm_model.pkl")

print("\n✅ Model saved as svm_model.pkl")