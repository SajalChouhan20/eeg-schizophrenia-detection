from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import joblib
import numpy as np
import mne
import os
import io
import smtplib
import bcrypt
import jwt
import datetime
import uuid
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pymongo import MongoClient
from bson import ObjectId
from bson.errors import InvalidId
from functools import wraps
from dotenv import load_dotenv
from scipy import stats
from scipy.signal import welch
from fpdf import FPDF

# Load .env from backend directory (works regardless of process cwd)
ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(ENV_PATH)

app = Flask(__name__)
CORS(app)

# ============================================
# CONFIG
# ============================================
SECRET_KEY = os.getenv("SECRET_KEY", "neuroscan_ai_super_secure_secret_key_2026_for_jwt_authentication")


def get_smtp_settings():
    """Load SMTP settings at send-time so .env changes apply after restart."""
    load_dotenv(ENV_PATH, override=True)

    user = (os.getenv("SMTP_USER") or "").strip()
    # Gmail App Passwords are 16 chars; spaces in .env must be stripped
    password = (os.getenv("SMTP_PASSWORD") or "").strip().replace(" ", "")
    host = (os.getenv("SMTP_HOST") or "smtp.gmail.com").strip()
    port_raw = (os.getenv("SMTP_PORT") or "587").strip()
    from_addr = (os.getenv("SMTP_FROM") or user).strip()

    try:
        port = int(port_raw)
    except ValueError:
        port = 587

    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "from_addr": from_addr,
    }


def log_smtp_config(smtp):
    """Debug log for SMTP (never prints the real password)."""
    print("[SMTP] --- configuration ---")
    print(f"[SMTP] ENV file: {ENV_PATH} (exists={os.path.isfile(ENV_PATH)})")
    print(f"[SMTP] host={smtp['host']}")
    print(f"[SMTP] port={smtp['port']}")
    print(f"[SMTP] user={smtp['user'] or '(MISSING)'}")
    print(f"[SMTP] from={smtp['from_addr'] or '(MISSING)'}")
    print(
        f"[SMTP] password={'set (' + str(len(smtp['password'])) + ' chars)' if smtp['password'] else '(MISSING)'}"
    )

# ============================================
# MONGODB ATLAS CONNECTION
# ============================================
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.server_info()  # Force connection check
    db = client.get_default_database("neuroscan_db")
    doctors_collection = db["doctors"]
    reports_collection = db["reports"]
    doctors_collection.create_index("email", unique=True)
    reports_collection.create_index("doctorEmail")
    reports_collection.create_index("createdAt")
    print(f"[OK] MongoDB connected successfully! Database: {db.name}")
except Exception as e:
    print(f"[WARN] MongoDB connection failed: {e}")
    print("[WARN] Auth features will not work without MongoDB.")
    db = None
    doctors_collection = None
    reports_collection = None

# ============================================
# LOAD MODEL
# ============================================
model = joblib.load("svm_model.pkl")

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Standard 10-20 EEG channel names (19 channels)
STANDARD_CHANNELS = [
    "Fp1", "Fp2", "F3", "F4", "C3", "C4", "P3", "P4",
    "O1", "O2", "F7", "F8", "T3", "T4", "T5", "T6",
    "Fz", "Cz", "Pz",
]

N_CHANNELS = 19

# EEG frequency band definitions
FREQ_BANDS = {
    "delta": (0.5, 4.0),
    "theta": (4.0, 8.0),
    "alpha": (8.0, 13.0),
    "beta": (13.0, 30.0),
    "gamma": (30.0, 45.0),
}

BAND_RANGES = {
    "delta": "0.5 - 4 Hz",
    "theta": "4 - 8 Hz",
    "alpha": "8 - 13 Hz",
    "beta": "13 - 30 Hz",
    "gamma": "30 - 45 Hz",
}

PATIENT_FORM_FIELDS = [
    "patientName",
    "patientAge",
    "patientGender",
    "patientId",
    "referringDoctor",
    "doctorEmail",
    "hospital",
    "testDate",
]


# ============================================
# AUTH MIDDLEWARE
# ============================================
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]

        if not token:
            return jsonify({"error": "Authentication token is missing!"}), 401

        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            current_user = doctors_collection.find_one({"email": data["email"]})
            if not current_user:
                return jsonify({"error": "Invalid token!"}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired!"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token!"}), 401

        return f(current_user, *args, **kwargs)

    return decorated


def get_doctor_from_token():
    """Return doctor document if valid Bearer token present, else None."""
    if doctors_collection is None:
        return None

    token = None
    if "Authorization" in request.headers:
        auth_header = request.headers["Authorization"]
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        return None

    try:
        data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return doctors_collection.find_one({"email": data["email"]})
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def serialize_report(doc):
    """Convert MongoDB report document to JSON-safe dict."""
    if not doc:
        return None
    return {
        "id": str(doc["_id"]),
        "reportId": doc.get("reportId", ""),
        "doctorEmail": doc.get("doctorEmail", ""),
        "doctorName": doc.get("doctorName", ""),
        "createdAt": doc.get("createdAt").isoformat() if doc.get("createdAt") else None,
        "status": doc.get("status", "Pending Review"),
        "patient_info": doc.get("patient_info", {}),
        "prediction": doc.get("prediction", ""),
        "confidence": doc.get("confidence", 0),
        "band_powers": doc.get("band_powers", {}),
        "band_powers_pct": doc.get("band_powers_pct", {}),
        "channel_features": doc.get("channel_features", []),
        "clinical_notes": doc.get("clinical_notes"),
    }


def send_report_emails(recipients, pdf_bytes, filename, patient_name, prediction):
    """Send PDF report to one or more email addresses via SMTP."""
    smtp = get_smtp_settings()
    log_smtp_config(smtp)

    if not smtp["user"] or not smtp["password"]:
        raise RuntimeError(
            "Email not configured. Set SMTP_USER and SMTP_PASSWORD in backend/.env "
            f"(looked in {ENV_PATH})"
        )

    unique_recipients = list({r.strip() for r in recipients if r and r.strip()})
    if not unique_recipients:
        raise ValueError("No valid recipient email addresses provided")

    subject = f"NeuroScan AI EEG Report — {patient_name}"
    body = (
        f"Dear recipient,\n\n"
        f"Please find attached the EEG screening report for {patient_name}.\n\n"
        f"AI Screening Result: {prediction}\n\n"
        f"This report was generated by NeuroScan AI. "
        f"It is an AI screening tool only and not a substitute for clinical diagnosis.\n\n"
        f"Regards,\nNeuroScan AI"
    )

    print(f"[SMTP] Connecting to {smtp['host']}:{smtp['port']} …")
    try:
        with smtplib.SMTP(smtp["host"], smtp["port"], timeout=30) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            print(f"[SMTP] Authenticating as {smtp['user']} …")
            server.login(smtp["user"], smtp["password"])
            print("[SMTP] Authentication successful")

            for recipient in unique_recipients:
                msg = MIMEMultipart()
                msg["From"] = smtp["from_addr"]
                msg["To"] = recipient
                msg["Subject"] = subject
                msg.attach(MIMEText(body, "plain"))
                attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
                attachment.add_header("Content-Disposition", "attachment", filename=filename)
                msg.attach(attachment)
                print(f"[SMTP] Sending to {recipient} …")
                server.send_message(msg)
                print(f"[SMTP] Sent to {recipient}")

    except smtplib.SMTPAuthenticationError as e:
        print(f"[SMTP] AUTH FAILED: {e}")
        raise RuntimeError(
            "Gmail SMTP authentication failed. Use a Google App Password (not your "
            "regular password), enable 2-Step Verification, and set SMTP_PASSWORD in "
            ".env without spaces or wrapped in quotes."
        ) from e
    except smtplib.SMTPException as e:
        print(f"[SMTP] SMTP error: {e}")
        raise RuntimeError(f"SMTP error: {e}") from e
    except OSError as e:
        print(f"[SMTP] Connection error: {e}")
        raise RuntimeError(f"Could not connect to mail server {smtp['host']}:{smtp['port']}: {e}") from e


# ============================================
# AUTH ROUTES
# ============================================
@app.route("/api/register", methods=["POST"])
def register():
    if doctors_collection is None:
        return jsonify({"error": "Database not connected"}), 500

    data = request.get_json()

    # Validate required fields
    required_fields = ["fullName", "email", "password", "hospital", "doctorId"]
    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    # Check if doctor already exists
    existing = doctors_collection.find_one({"email": data["email"]})
    if existing:
        return jsonify({"error": "A doctor with this email already exists"}), 409

    # Check if doctorId + hospital combo already exists
    existing_id = doctors_collection.find_one({
        "doctorId": data["doctorId"],
        "hospital": data["hospital"]
    })
    if existing_id:
        return jsonify({"error": "This Doctor ID is already registered at this hospital"}), 409

    # Hash password
    hashed_password = bcrypt.hashpw(data["password"].encode("utf-8"), bcrypt.gensalt())

    # Create doctor document
    doctor = {
        "fullName": data["fullName"],
        "email": data["email"],
        "password": hashed_password,
        "hospital": data["hospital"],
        "doctorId": data["doctorId"],
        "createdAt": datetime.datetime.now(datetime.timezone.utc)
    }

    doctors_collection.insert_one(doctor)

    # Generate JWT token
    token = jwt.encode({
        "email": data["email"],
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)
    }, SECRET_KEY, algorithm="HS256")

    return jsonify({
        "message": "Registration successful!",
        "token": token,
        "doctor": {
            "fullName": data["fullName"],
            "email": data["email"],
            "hospital": data["hospital"],
            "doctorId": data["doctorId"]
        }
    }), 201


@app.route("/api/login", methods=["POST"])
def login():
    if doctors_collection is None:
        return jsonify({"error": "Database not connected"}), 500

    data = request.get_json()

    if not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email and password are required"}), 400

    # Find doctor
    doctor = doctors_collection.find_one({"email": data["email"]})
    if not doctor:
        return jsonify({"error": "Invalid email or password"}), 401

    # Check password
    if not bcrypt.checkpw(data["password"].encode("utf-8"), doctor["password"]):
        return jsonify({"error": "Invalid email or password"}), 401

    # Generate JWT token
    token = jwt.encode({
        "email": doctor["email"],
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)
    }, SECRET_KEY, algorithm="HS256")

    return jsonify({
        "message": "Login successful!",
        "token": token,
        "doctor": {
            "fullName": doctor["fullName"],
            "email": doctor["email"],
            "hospital": doctor["hospital"],
            "doctorId": doctor["doctorId"]
        }
    }), 200


@app.route("/api/verify", methods=["GET"])
@token_required
def verify_token(current_user):
    return jsonify({
        "valid": True,
        "doctor": {
            "fullName": current_user["fullName"],
            "email": current_user["email"],
            "hospital": current_user["hospital"],
            "doctorId": current_user["doctorId"]
        }
    }), 200


# ============================================
# EEG FEATURE EXTRACTION (174 + model-compatible 38)
# ============================================
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


def get_model_feature_vector(extraction):
    try:
        expected = model.named_steps["standardscaler"].n_features_in_
    except AttributeError:
        expected = N_CHANNELS * 2  # fallback to 38

    print(f"[DEBUG] Model expects: {expected} features")
    print(f"[DEBUG] features_174 length: {len(extraction['features_174'])}")
    print(f"[DEBUG] model_features length: {len(extraction['model_features'])}")

    if expected == len(extraction["features_174"]):
        print("[DEBUG] Using 174-feature vector")
        return extraction["features_174"]
    elif expected == len(extraction["model_features"]):
        print("[DEBUG] Using 38-feature vector")
        return extraction["model_features"]
    else:
        print(f"[ERROR] No matching feature vector for expected={expected}")
        return None


def compute_confidence(model, features):
    """Compute a pseudo-confidence score from the SVM decision function.
    The SVM in sklearn does not output probabilities by default, so we use
    the decision function value and apply a sigmoid to map it to [0, 100]."""
    try:
        decision = model.decision_function([features])[0]
        # Sigmoid mapping: further from boundary = higher confidence
        confidence = 1.0 / (1.0 + np.exp(-abs(decision)))
        # Scale to percentage (50% = boundary, 100% = very confident)
        confidence_pct = round(confidence * 100, 1)
        return max(50.0, min(99.9, confidence_pct))
    except Exception:
        return 75.0  # fallback


# ============================================
# PATIENT FORM PAGE
# ============================================
FORM_HTML_PATH = os.path.join(
    os.path.dirname(__file__), "..", "frontend", "patient-form.html"
)


@app.route("/")
def serve_patient_form():
    if os.path.isfile(FORM_HTML_PATH):
        return send_file(FORM_HTML_PATH)
    return jsonify({"error": "Patient form page not found"}), 404


# ============================================
# PREDICTION ROUTE
# ============================================
@app.route("/predict", methods=["POST"])
def predict():
    if "file" not in request.files:
        return jsonify({"error": "No EEG file uploaded"}), 400

    file = request.files["file"]
    if not file or not file.filename:
        return jsonify({"error": "No EEG file uploaded"}), 400

    if not file.filename.lower().endswith(".edf"):
        return jsonify({"error": "Only .edf files are accepted"}), 400

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    try:
        extraction = extract_eeg_data(file_path)
        if extraction is None:
            return jsonify({
                "error": "Failed to extract features from EEG file. Ensure it is a valid .edf file.",
            }), 400

        feature_vector = get_model_feature_vector(extraction)
        if feature_vector is None:
            return jsonify({
                "error": "Feature vector mismatch. Model expects a different"
                         " number of features than extracted.",
            }), 400

        prediction_label = model.predict([feature_vector])[0]
        result = "Schizophrenia Detected" if prediction_label == 1 else "Healthy"
        confidence = compute_confidence(model, feature_vector)

        patient_info = {
            field: request.form.get(field, "").strip() or "N/A"
            for field in PATIENT_FORM_FIELDS
        }

        response_data = {
            "prediction": result,
            "confidence": confidence,
            "features_extracted": len(extraction["features_174"]),
            "band_powers": extraction["band_powers"],
            "band_powers_pct": extraction["band_powers_pct"],
            "channel_features": extraction["channel_features"],
            "num_channels": extraction["num_channels"],
            "sampling_rate": extraction["sampling_rate"],
            "channel_names": extraction["channel_names"],
            "patient_info": patient_info,
        }

        doctor = get_doctor_from_token()
        if doctor and reports_collection is not None:
            now = datetime.datetime.now(datetime.timezone.utc)
            report_id_str = f"RPT-{now.strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
            report_doc = {
                "reportId": report_id_str,
                "doctorEmail": doctor["email"],
                "doctorName": doctor.get("fullName", ""),
                "createdAt": now,
                "status": "Pending Review",
                "patient_info": patient_info,
                "prediction": result,
                "confidence": confidence,
                "band_powers": extraction["band_powers"],
                "band_powers_pct": extraction["band_powers_pct"],
                "channel_features": extraction["channel_features"],
            }
            inserted = reports_collection.insert_one(report_doc)
            response_data["reportId"] = report_id_str
            response_data["id"] = str(inserted.inserted_id)

        return jsonify(response_data)

    except Exception as e:
        print(f"[ERROR] Prediction failed: {e}")
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500

    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


# ============================================
# PDF REPORT GENERATION
# ============================================
class MedicalReport(FPDF):
    """Custom PDF class for the EEG Schizophrenia Screening Report."""

    def header(self):
        # Top accent bar
        self.set_fill_color(41, 98, 255)  # Blue accent
        self.rect(0, 0, 210, 3, "F")

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"NeuroScan AI - EEG Screening Report | Page {self.page_no()}/{{nb}}", align="C")


def build_report_pdf(
    patient,
    prediction,
    confidence,
    band_powers,
    band_powers_pct,
    channel_features,
    report_id=None,
    clinical_notes=None,
):
    """Build PDF bytes for screening / final clinical report."""
    now = datetime.datetime.now()
    if not report_id:
        report_id = f"RPT-{now.strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"

    pdf = MedicalReport()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)

    # ============ PAGE 1 ============
    pdf.add_page()

    # Hospital name
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(41, 98, 255)
    hospital_name = patient.get("hospital", "NeuroScan Medical Center")
    pdf.cell(0, 12, hospital_name, ln=True, align="C")

    # Title
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(40, 40, 40)
    pdf.cell(0, 10, "EEG-Based Schizophrenia Screening Report", ln=True, align="C")

    # Report meta
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(0, 6, f"Report ID: {report_id}  |  Generated: {now.strftime('%B %d, %Y at %I:%M %p')}", ln=True, align="C")

    # Divider
    pdf.ln(6)
    pdf.set_draw_color(200, 200, 200)
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(8)

    # Patient Information Table
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(41, 98, 255)
    pdf.cell(0, 8, "PATIENT INFORMATION", ln=True)
    pdf.ln(2)

    patient_fields = [
        ("Patient Name", patient.get("patientName", "N/A")),
        ("Age", patient.get("patientAge", "N/A")),
        ("Gender", patient.get("patientGender", "N/A")),
        ("Patient ID / Case No.", patient.get("patientId", "N/A")),
        ("Referring Doctor", patient.get("referringDoctor", "N/A")),
        ("Doctor Email", patient.get("doctorEmail", "N/A")),
        ("Hospital / Clinic", patient.get("hospital", "N/A")),
        ("Date of Test", patient.get("testDate", "N/A")),
    ]

    pdf.set_font("Helvetica", "", 9)
    for i, (label, value) in enumerate(patient_fields):
        if i % 2 == 0:
            pdf.set_fill_color(245, 247, 250)
        else:
            pdf.set_fill_color(255, 255, 255)

        pdf.set_text_color(80, 80, 80)
        pdf.cell(65, 8, f"  {label}", border=1, fill=True)
        pdf.set_text_color(30, 30, 30)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(0, 8, f"  {value}", border=1, ln=True, fill=True)
        pdf.set_font("Helvetica", "", 9)

    # Prediction Result Section
    pdf.ln(10)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(41, 98, 255)
    pdf.cell(0, 8, "DIAGNOSTIC RESULT", ln=True)
    pdf.ln(4)

    # Result box
    is_healthy = "Healthy" in prediction
    if is_healthy:
        pdf.set_fill_color(220, 252, 231)  # Green bg
        pdf.set_text_color(22, 101, 52)
        result_icon = "HEALTHY"
    else:
        pdf.set_fill_color(254, 226, 226)  # Red bg
        pdf.set_text_color(153, 27, 27)
        result_icon = "SCHIZOPHRENIA DETECTED"

    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 16, f"  {result_icon}", border=1, ln=True, fill=True, align="C")

    pdf.ln(2)
    pdf.set_text_color(60, 60, 60)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 8, f"Model Confidence: {confidence}%", ln=True, align="C")

    # Clinical interpretation
    pdf.ln(6)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(41, 98, 255)
    pdf.cell(0, 8, "Clinical Interpretation:", ln=True)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(60, 60, 60)

    if is_healthy:
        interpretation = "No significant abnormalities detected."
    else:
        interpretation = "Abnormal patterns detected. Clinical evaluation recommended."
    pdf.multi_cell(0, 5, interpretation)

    # ============ PAGE 2 ============
    pdf.add_page()

    # Band Power Summary
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(41, 98, 255)
    pdf.cell(0, 8, "EEG BAND POWER ANALYSIS", ln=True)
    pdf.ln(3)

    # Table header
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(41, 98, 255)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(40, 8, "  Band", border=1, fill=True)
    pdf.cell(45, 8, "  Frequency Range", border=1, fill=True)
    pdf.cell(45, 8, "  Avg Power", border=1, fill=True)
    pdf.cell(0, 8, "  Status", border=1, ln=True, fill=True)

    pdf.set_font("Helvetica", "", 9)
    for i, band in enumerate(FREQ_BANDS.keys()):
        freq_range = BAND_RANGES[band]
        pct = band_powers_pct.get(band, 0)
        avg_power = float(band_powers.get(band, pct / 100 if pct else 0))
        status = "Normal" if is_healthy else ("Elevated" if pct > 30 else "Review")

        if i % 2 == 0:
            pdf.set_fill_color(245, 247, 250)
        else:
            pdf.set_fill_color(255, 255, 255)

        pdf.set_text_color(30, 30, 30)
        pdf.cell(40, 8, f"  {band.capitalize()}", border=1, fill=True)
        pdf.cell(45, 8, f"  {freq_range}", border=1, fill=True)
        pdf.cell(45, 8, f"  {avg_power:.4f}", border=1, fill=True)

        if status == "Normal":
            pdf.set_text_color(22, 101, 52)
        else:
            pdf.set_text_color(180, 50, 50)
        pdf.cell(0, 8, f"  {status}", border=1, ln=True, fill=True)
        pdf.set_text_color(30, 30, 30)

    # Channel Features Table
    pdf.ln(8)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(41, 98, 255)
    pdf.cell(0, 8, "CHANNEL-WISE FEATURE SUMMARY", ln=True)
    pdf.ln(3)

    # Table header
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_fill_color(41, 98, 255)
    pdf.set_text_color(255, 255, 255)
    col_widths = [30, 38, 38, 38, 38]
    headers = ["Channel", "Mean", "Std Dev", "Skewness", "Kurtosis"]
    for j, h in enumerate(headers):
        pdf.cell(col_widths[j], 7, f"  {h}", border=1, fill=True)
    pdf.ln()

    pdf.set_font("Helvetica", "", 7)
    for i, ch in enumerate(channel_features):
        if i % 2 == 0:
            pdf.set_fill_color(245, 247, 250)
        else:
            pdf.set_fill_color(255, 255, 255)

        pdf.set_text_color(30, 30, 30)
        pdf.cell(col_widths[0], 6, f"  {ch.get('channel', 'N/A')}", border=1, fill=True)

        # Format scientific notation
        mean_val = ch.get("mean", 0)
        std_val = ch.get("std", 0)
        skew_val = ch.get("skewness", 0)
        kurt_val = ch.get("kurtosis", 0)

        pdf.cell(col_widths[1], 6, f"  {mean_val:.6f}", border=1, fill=True)
        pdf.cell(col_widths[2], 6, f"  {std_val:.6f}", border=1, fill=True)

        # Highlight abnormal skewness (> 2 or < -2)
        if abs(skew_val) > 2:
            pdf.set_text_color(180, 30, 30)
        pdf.cell(col_widths[3], 6, f"  {skew_val:.4f}", border=1, fill=True)
        pdf.set_text_color(30, 30, 30)

        # Highlight abnormal kurtosis (> 7)
        if abs(kurt_val) > 7:
            pdf.set_text_color(180, 30, 30)
        pdf.cell(col_widths[4], 6, f"  {kurt_val:.4f}", border=1, fill=True, ln=True)
        pdf.set_text_color(30, 30, 30)

    # Disclaimer
    pdf.ln(10)
    pdf.set_draw_color(200, 200, 200)
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(180, 50, 50)
    pdf.cell(0, 5, "DISCLAIMER", ln=True)
    pdf.set_font("Helvetica", "I", 7)
    pdf.set_text_color(120, 120, 120)
    disclaimer = (
        "AI screening tool only. Not a substitute for clinical diagnosis."
    )
    pdf.multi_cell(0, 4, disclaimer)

    if clinical_notes:
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(41, 98, 255)
        pdf.cell(0, 8, "CLINICAL NOTES (DOCTOR)", ln=True)
        pdf.ln(4)

        notes_fields = [
            ("Clinical Observations", clinical_notes.get("clinicalObservations", "N/A")),
            ("Additional Diagnosis Notes", clinical_notes.get("diagnosisNotes", "N/A")),
            ("Severity Scale (1-10)", str(clinical_notes.get("severityScale", "N/A"))),
            ("Recommended Follow-up", clinical_notes.get("followUp", "N/A")),
            ("Doctor Signature", clinical_notes.get("doctorSignature", "N/A")),
            ("Patient Email", clinical_notes.get("patientEmail", "N/A")),
            ("Doctor Email", clinical_notes.get("doctorEmail", "N/A")),
        ]
        if clinical_notes.get("secondaryEmail"):
            notes_fields.append(("Secondary Email", clinical_notes["secondaryEmail"]))

        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(60, 60, 60)
        for label, value in notes_fields:
            pdf.set_font("Helvetica", "B", 9)
            pdf.cell(0, 6, label + ":", ln=True)
            pdf.set_font("Helvetica", "", 9)
            pdf.multi_cell(0, 5, str(value))
            pdf.ln(2)

        pdf.ln(4)
        pdf.set_font("Helvetica", "I", 8)
        pdf.cell(
            0, 6,
            f"Signed electronically on {now.strftime('%B %d, %Y at %I:%M %p')}",
            ln=True,
        )

    return pdf.output(), report_id


@app.route("/generate-report", methods=["POST"])
def generate_report():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        pdf_bytes, report_id = build_report_pdf(
            patient=data.get("patient_info", {}),
            prediction=data.get("prediction", "Unknown"),
            confidence=data.get("confidence", 0),
            band_powers=data.get("band_powers", {}),
            band_powers_pct=data.get("band_powers_pct", {}),
            channel_features=data.get("channel_features", []),
            clinical_notes=data.get("clinical_notes"),
        )

        buffer = io.BytesIO(pdf_bytes)
        buffer.seek(0)
        filename = f"NeuroScan_Report_{report_id}.pdf"

        return send_file(
            buffer,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=filename,
        )

    except Exception as e:
        print(f"[ERROR] Report generation failed: {e}")
        return jsonify({"error": f"Report generation failed: {str(e)}"}), 500


# ============================================
# REPORTS API (Doctor dashboard)
# ============================================
@app.route("/api/reports", methods=["GET"])
@token_required
def list_reports(current_user):
    if reports_collection is None:
        return jsonify({"error": "Database not connected"}), 500

    query = {"doctorEmail": current_user["email"]}
    search = request.args.get("search", "").strip()
    if search:
        query["patient_info.patientName"] = {"$regex": search, "$options": "i"}

    reports = reports_collection.find(query).sort("createdAt", -1)
    return jsonify({
        "reports": [serialize_report(r) for r in reports],
    }), 200


@app.route("/api/reports/<report_id>", methods=["GET"])
@token_required
def get_report(current_user, report_id):
    if reports_collection is None:
        return jsonify({"error": "Database not connected"}), 500

    try:
        oid = ObjectId(report_id)
    except InvalidId:
        return jsonify({"error": "Invalid report ID"}), 400

    report = reports_collection.find_one({"_id": oid, "doctorEmail": current_user["email"]})
    if not report:
        return jsonify({"error": "Report not found"}), 404

    return jsonify(serialize_report(report)), 200


@app.route("/api/reports/<report_id>/send-final", methods=["POST"])
@token_required
def send_final_report(current_user, report_id):
    if reports_collection is None:
        return jsonify({"error": "Database not connected"}), 500

    try:
        oid = ObjectId(report_id)
    except InvalidId:
        return jsonify({"error": "Invalid report ID"}), 400

    report = reports_collection.find_one({"_id": oid, "doctorEmail": current_user["email"]})
    if not report:
        return jsonify({"error": "Report not found"}), 404

    data = request.get_json() or {}
    patient_email = (data.get("patientEmail") or "").strip()
    doctor_email = (data.get("doctorEmail") or current_user["email"]).strip()
    secondary_email = (data.get("secondaryEmail") or "").strip()

    if not patient_email:
        return jsonify({"error": "Patient email is required"}), 400
    if not doctor_email:
        return jsonify({"error": "Doctor email is required"}), 400

    clinical_notes = {
        "clinicalObservations": data.get("clinicalObservations", ""),
        "diagnosisNotes": data.get("diagnosisNotes", ""),
        "severityScale": data.get("severityScale", 5),
        "followUp": data.get("followUp", "None"),
        "doctorSignature": data.get("doctorSignature", current_user.get("fullName", "")),
        "patientEmail": patient_email,
        "doctorEmail": doctor_email,
        "secondaryEmail": secondary_email,
    }

    try:
        pdf_bytes, report_id_str = build_report_pdf(
            patient=report.get("patient_info", {}),
            prediction=report.get("prediction", "Unknown"),
            confidence=report.get("confidence", 0),
            band_powers=report.get("band_powers", {}),
            band_powers_pct=report.get("band_powers_pct", {}),
            channel_features=report.get("channel_features", []),
            report_id=report.get("reportId"),
            clinical_notes=clinical_notes,
        )

        filename = f"NeuroScan_Report_{report_id_str}.pdf"
        patient_name = report.get("patient_info", {}).get("patientName", "Patient")

        recipients = [patient_email, doctor_email]
        if secondary_email:
            recipients.append(secondary_email)

        send_report_emails(
            recipients,
            pdf_bytes,
            filename,
            patient_name,
            report.get("prediction", ""),
        )

        reports_collection.update_one(
            {"_id": oid},
            {"$set": {
                "status": "Sent",
                "clinical_notes": clinical_notes,
                "sentAt": datetime.datetime.now(datetime.timezone.utc),
            }},
        )

        return jsonify({
            "message": "Report generated and sent successfully",
            "sentTo": [r for r in recipients if r],
            "reportId": report_id_str,
        }), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except RuntimeError as e:
        import traceback
        traceback.print_exc()
        err_msg = str(e)
        status = 503 if "not configured" in err_msg.lower() else 502
        return jsonify({"error": err_msg}), status
    except smtplib.SMTPException as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Email delivery failed: {e}"}), 502
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[ERROR] Send final report failed: {e}")
        return jsonify({"error": f"Failed to send report: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(debug=True, use_reloader=True, reloader_type="stat")