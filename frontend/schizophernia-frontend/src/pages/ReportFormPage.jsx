import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE, authHeaders } from "../config/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function ReportFormPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { doctor, token, logout } = useAuth();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [clinicalObservations, setClinicalObservations] = useState("");
  const [diagnosisNotes, setDiagnosisNotes] = useState("");
  const [severityScale, setSeverityScale] = useState(5);
  const [followUp, setFollowUp] = useState("None");
  const [patientEmail, setPatientEmail] = useState("");
  const [doctorEmail, setDoctorEmail] = useState(doctor?.email || "");
  const [secondaryEmail, setSecondaryEmail] = useState("");

  useEffect(() => {
    if (doctor?.email) setDoctorEmail(doctor.email);
  }, [doctor]);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/reports/${reportId}`, {
          headers: authHeaders(token),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load report");
        setReport(data);
        if (data.clinical_notes) {
          setClinicalObservations(data.clinical_notes.clinicalObservations || "");
          setDiagnosisNotes(data.clinical_notes.diagnosisNotes || "");
          setSeverityScale(data.clinical_notes.severityScale ?? 5);
          setFollowUp(data.clinical_notes.followUp || "None");
          setPatientEmail(data.clinical_notes.patientEmail || "");
          setDoctorEmail(data.clinical_notes.doctorEmail || doctor?.email || "");
          setSecondaryEmail(data.clinical_notes.secondaryEmail || "");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (reportId && token) fetchReport();
  }, [reportId, token, doctor]);

  const handleSend = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!patientEmail.trim() || !doctorEmail.trim()) {
      setError("Patient email and doctor email are required.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports/${reportId}/send-final`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
          clinicalObservations,
          diagnosisNotes,
          severityScale: Number(severityScale),
          followUp,
          doctorSignature: doctor?.fullName || "",
          patientEmail: patientEmail.trim(),
          doctorEmail: doctorEmail.trim(),
          secondaryEmail: secondaryEmail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send report");
      setSuccess(data.message || "Report sent successfully!");
      setReport((prev) => (prev ? { ...prev, status: "Sent" } : prev));
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const bandChartData = report
    ? {
        labels: ["Delta", "Theta", "Alpha", "Beta", "Gamma"],
        datasets: [
          {
            label: "Relative Power (%)",
            data: ["delta", "theta", "alpha", "beta", "gamma"].map(
              (b) => (report.band_powers?.[b] || 0) * 100
            ),
            backgroundColor: [
              "rgba(99, 102, 241, 0.8)",
              "rgba(129, 140, 248, 0.8)",
              "rgba(165, 180, 252, 0.8)",
              "rgba(199, 210, 254, 0.9)",
              "rgba(224, 231, 255, 0.95)",
            ],
            borderColor: "#6366f1",
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      }
    : null;

  const pi = report?.patient_info || {};
  const healthy = report?.prediction === "Healthy";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-slate-400">
        Loading report…
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-slate-400 gap-4">
        <p>{error || "Report not found"}</p>
        <Link to="/dashboard" className="text-indigo-400 hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans">
      <header className="container mx-auto px-6 py-6 flex justify-between items-center border-b border-slate-800/50">
        <div>
          <h1 className="text-xl font-bold text-white">Clinical Report</h1>
          <p className="text-xs text-slate-500">{report.reportId}</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="text-xs font-semibold text-indigo-400 border border-indigo-500/30 rounded-xl px-4 py-2"
          >
            ← Dashboard
          </button>
          <button onClick={logout} className="text-xs font-semibold text-rose-400 border border-rose-500/20 rounded-xl px-4 py-2">
            Sign Out
          </button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 max-w-4xl space-y-8">
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-sm">{success}</div>
        )}

        {/* Read-only EEG prediction card */}
        <section className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
          <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-widest">EEG Analysis (Read-only)</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <p><span className="text-slate-500">Patient:</span> {pi.patientName}</p>
            <p><span className="text-slate-500">Age / Gender:</span> {pi.patientAge} / {pi.patientGender}</p>
            <p><span className="text-slate-500">Patient ID:</span> {pi.patientId}</p>
            <p><span className="text-slate-500">Test Date:</span> {pi.testDate}</p>
          </div>
          <div className={`p-6 rounded-2xl text-center ${healthy ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-rose-500/10 border border-rose-500/30"}`}>
            <p className="text-3xl font-black">{healthy ? "✅ Healthy" : "⚠️ Schizophrenia Detected"}</p>
            <p className="mt-2 text-slate-300">Confidence: {Number(report.confidence).toFixed(1)}%</p>
          </div>
          {bandChartData && (
            <div className="h-64">
              <Bar
                data={bandChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true, max: 100 } },
                }}
              />
            </div>
          )}
        </section>

        {/* Clinical notes form */}
        <form onSubmit={handleSend} className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
          <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-widest">Doctor&apos;s Clinical Notes</h2>

          <div>
            <label className="text-xs text-slate-500 uppercase font-semibold">Clinical Observations</label>
            <textarea
              value={clinicalObservations}
              onChange={(e) => setClinicalObservations(e.target.value)}
              rows={4}
              className="mt-1 w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm"
              placeholder="Enter clinical observations…"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase font-semibold">Additional Diagnosis Notes</label>
            <textarea
              value={diagnosisNotes}
              onChange={(e) => setDiagnosisNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase font-semibold">
              Severity Scale: {severityScale}/10
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={severityScale}
              onChange={(e) => setSeverityScale(e.target.value)}
              className="mt-2 w-full accent-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase font-semibold">Recommended Follow-up</label>
            <select
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              className="mt-1 w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm"
            >
              <option>None</option>
              <option>1 Month</option>
              <option>3 Months</option>
              <option>6 Months</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase font-semibold">Doctor Signature / Name</label>
            <input
              type="text"
              readOnly
              value={doctor?.fullName || ""}
              className="mt-1 w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-400"
            />
          </div>

          <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-widest pt-4">Contact &amp; Delivery</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 uppercase font-semibold">Patient Email *</label>
              <input
                type="email"
                required
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                className="mt-1 w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase font-semibold">Doctor Email *</label>
              <input
                type="email"
                required
                value={doctorEmail}
                onChange={(e) => setDoctorEmail(e.target.value)}
                className="mt-1 w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-slate-500 uppercase font-semibold">Secondary Email (optional)</label>
              <input
                type="email"
                value={secondaryEmail}
                onChange={(e) => setSecondaryEmail(e.target.value)}
                className="mt-1 w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={sending || report.status === "Sent"}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-2xl font-bold text-white"
          >
            {sending ? "Generating & Sending…" : report.status === "Sent" ? "Report Already Sent" : "Generate & Send Report"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default ReportFormPage;
