# ============================================
# EEG Schizophrenia Detection (FINAL VERSION)
# ============================================

import os
import numpy as np
import mne
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib

DATA_PATH = "../dataverse_files"

X, y = [], []

# ============================================
# FEATURE EXTRACTION
# ============================================
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


# ============================================
# LOAD DATASET
# ============================================
for file in os.listdir(DATA_PATH):

    if not file.endswith(".edf"):
        continue

    path = os.path.join(DATA_PATH, file)
    features = extract_features(path)

    if features is None:
        continue

    # ✅ LABEL ASSIGNMENT (IMPORTANT)
    if file.lower().startswith("h"):
        label = 0   # Healthy
    elif file.lower().startswith("s"):
        label = 1   # Schizophrenia
    else:
        continue   # skip unknown files

    X.append(features)
    y.append(label)


# Convert to numpy
X = np.array(X)
y = np.array(y)

print("Total samples:", len(X))
print("Label distribution:", np.bincount(y))


# ============================================
# STRATIFIED TRAIN-TEST SPLIT (NO BIAS 🔥)
# ============================================
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y   # 👈 KEY POINT
)

print("\nTrain distribution:", np.bincount(y_train))
print("Test distribution:", np.bincount(y_test))


# ============================================
# MODEL (PIPELINE)
# ============================================
model = make_pipeline(
    StandardScaler(),   # Feature scaling
    SVC(
        kernel='rbf',
        C=10,
        gamma='scale',
        class_weight='balanced'
    )
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


# Sample Predictions
print("\nSample Predictions:")
for i in range(min(10, len(X_test))):
    print("Actual:", y_test[i], "Predicted:", y_pred[i])


# ============================================
# SAVE MODEL
# ============================================
joblib.dump(model, "svm_model.pkl")

print("\n✅ Model saved as svm_model.pkl")