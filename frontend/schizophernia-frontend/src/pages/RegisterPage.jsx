import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Aurora from '../components/reactbits/Aurora';
import GradientText from '../components/reactbits/GradientText';

const HOSPITALS = [
  'AIIMS Delhi',
  'NIMHANS Bangalore',
  'Apollo Hospitals',
  'Fortis Healthcare',
  'Max Super Speciality',
  'Medanta - The Medicity',
  'Manipal Hospitals',
  'Narayana Health',
  'Kokilaben Dhirubhai Ambani Hospital',
  'Sir Ganga Ram Hospital',
  'Other',
];

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    hospital: '',
    customHospital: '',
    doctorId: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = personal, 2 = hospital
  const navigate = useNavigate();
  const { login } = useAuth();

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const hospital = form.hospital === 'Other' ? form.customHospital : form.hospital;

    try {
      const res = await fetch('http://127.0.0.1:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          hospital,
          doctorId: form.doctorId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        login(data.token, data.doctor);
        navigate('/dashboard');
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch {
      setError('Server not reachable. Please try again.');
    }

    setLoading(false);
  };

  const canProceedStep1 =
    form.fullName.trim() && form.email.trim() && form.password && form.confirmPassword;

  const canSubmit =
    form.hospital && form.doctorId.trim() && (form.hospital !== 'Other' || form.customHospital.trim());

  return (
    <div style={styles.container}>
      {/* Aurora Background */}
      <div style={styles.auroraWrap}>
        <Aurora
          colorStops={['#4f46e5', '#7c3aed', '#0ea5e9']}
          amplitude={1.5}
          blend={0.5}
          speed={0.5}
        />
      </div>

      <div style={styles.overlay} />

      <div style={styles.content}>
        {/* Top Branding */}
        <div style={styles.brandBar}>
          <div style={styles.brandRow}>
            <div style={styles.logoBox}>
              <span style={{ fontSize: '24px' }}>🧠</span>
            </div>
            <GradientText
              colors={['#818cf8', '#38bdf8', '#a78bfa', '#818cf8']}
              animationSpeed={5}
            >
              <span style={styles.brandName}>NeuroScan AI</span>
            </GradientText>
          </div>
        </div>

        {/* Form Card */}
        <div style={styles.formCard}>
          <div style={styles.cardGlow} />
          <div style={styles.cardGlow2} />

          <div style={styles.formInner}>
            {/* Header */}
            <div style={styles.formHeader}>
              <h2 style={styles.formTitle}>Create Doctor Account</h2>
              <p style={styles.formSubtitle}>
                Verify your medical credentials to access the platform
              </p>
            </div>

            {/* Step Indicator */}
            <div style={styles.steps}>
              <div style={{ ...styles.stepDot, ...(step >= 1 ? styles.stepActive : {}) }}>
                <span style={styles.stepNum}>1</span>
              </div>
              <div style={{ ...styles.stepLine, ...(step >= 2 ? styles.stepLineActive : {}) }} />
              <div style={{ ...styles.stepDot, ...(step >= 2 ? styles.stepActive : {}) }}>
                <span style={styles.stepNum}>2</span>
              </div>
            </div>

            <div style={styles.stepLabel}>
              {step === 1 ? 'Personal Information' : 'Hospital Credentials'}
            </div>

            {error && (
              <div style={styles.errorBox}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={styles.form}>
              {step === 1 && (
                <div style={styles.stepFields}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Full Name</label>
                    <div style={styles.inputWrapper}>
                      <span style={styles.inputIcon}>👤</span>
                      <input
                        id="register-name"
                        type="text"
                        value={form.fullName}
                        onChange={(e) => updateField('fullName', e.target.value)}
                        placeholder="Dr. Jane Smith"
                        required
                        style={styles.input}
                      />
                    </div>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Email Address</label>
                    <div style={styles.inputWrapper}>
                      <span style={styles.inputIcon}>✉️</span>
                      <input
                        id="register-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        placeholder="doctor@hospital.com"
                        required
                        style={styles.input}
                      />
                    </div>
                  </div>

                  <div style={styles.row}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Password</label>
                      <div style={styles.inputWrapper}>
                        <span style={styles.inputIcon}>🔒</span>
                        <input
                          id="register-password"
                          type="password"
                          value={form.password}
                          onChange={(e) => updateField('password', e.target.value)}
                          placeholder="Min 6 characters"
                          required
                          style={styles.input}
                        />
                      </div>
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Confirm</label>
                      <div style={styles.inputWrapper}>
                        <span style={styles.inputIcon}>🔒</span>
                        <input
                          id="register-confirm-password"
                          type="password"
                          value={form.confirmPassword}
                          onChange={(e) => updateField('confirmPassword', e.target.value)}
                          placeholder="Re-enter password"
                          required
                          style={styles.input}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      if (form.password !== form.confirmPassword) {
                        setError('Passwords do not match');
                        return;
                      }
                      setStep(2);
                    }}
                    disabled={!canProceedStep1}
                    style={{
                      ...styles.submitBtn,
                      opacity: canProceedStep1 ? 1 : 0.5,
                      cursor: canProceedStep1 ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Continue to Hospital Credentials →
                  </button>
                </div>
              )}

              {step === 2 && (
                <div style={styles.stepFields}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Hospital / Institution</label>
                    <div style={styles.inputWrapper}>
                      <span style={styles.inputIcon}>🏥</span>
                      <select
                        id="register-hospital"
                        value={form.hospital}
                        onChange={(e) => updateField('hospital', e.target.value)}
                        required
                        style={{ ...styles.input, cursor: 'pointer', appearance: 'none' }}
                      >
                        <option value="" disabled>
                          Select your hospital
                        </option>
                        {HOSPITALS.map((h) => (
                          <option key={h} value={h} style={{ background: '#1e293b', color: '#e2e8f0' }}>
                            {h}
                          </option>
                        ))}
                      </select>
                      <span style={{ position: 'absolute', right: '14px', pointerEvents: 'none', color: '#64748b' }}>▼</span>
                    </div>
                  </div>

                  {form.hospital === 'Other' && (
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Hospital Name</label>
                      <div style={styles.inputWrapper}>
                        <span style={styles.inputIcon}>🏥</span>
                        <input
                          id="register-custom-hospital"
                          type="text"
                          value={form.customHospital}
                          onChange={(e) => updateField('customHospital', e.target.value)}
                          placeholder="Enter hospital name"
                          required
                          style={styles.input}
                        />
                      </div>
                    </div>
                  )}

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Doctor ID / Registration Number</label>
                    <div style={styles.inputWrapper}>
                      <span style={styles.inputIcon}>🪪</span>
                      <input
                        id="register-doctor-id"
                        type="text"
                        value={form.doctorId}
                        onChange={(e) => updateField('doctorId', e.target.value)}
                        placeholder="e.g., MCI-2024-XXXXX"
                        required
                        style={styles.input}
                      />
                    </div>
                  </div>

                  <div style={styles.infoBox}>
                    <span style={{ fontSize: '14px' }}>🛡️</span>
                    <span>
                      Your Doctor ID ensures only verified medical professionals can access this platform. This is matched against your hospital records.
                    </span>
                  </div>

                  <div style={styles.btnRow}>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      style={styles.backBtn}
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !canSubmit}
                      style={{
                        ...styles.submitBtn,
                        flex: 1,
                        opacity: loading || !canSubmit ? 0.5 : 1,
                        cursor: loading || !canSubmit ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {loading ? <div style={styles.spinner} /> : 'Create Account'}
                    </button>
                  </div>
                </div>
              )}
            </form>

            <div style={styles.divider}>
              <div style={styles.dividerLine} />
              <span style={styles.dividerText}>Already registered?</span>
              <div style={styles.dividerLine} />
            </div>

            <Link to="/login" style={styles.loginLink}>
              Sign In to Your Account →
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        * { box-sizing: border-box; }

        input::placeholder, select::placeholder {
          color: #475569;
        }
        input:focus, select:focus {
          outline: none;
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15), 0 0 20px rgba(99, 102, 241, 0.1) !important;
        }
        button:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        button:active:not(:disabled) {
          transform: translateY(0);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Inter', sans-serif",
    background: '#080b14',
  },
  auroraWrap: {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    opacity: 0.4,
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
    background: 'linear-gradient(to bottom, rgba(8,11,20,0.4), rgba(8,11,20,0.85))',
  },
  content: {
    position: 'relative',
    zIndex: 2,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    gap: '2rem',
    animation: 'fadeSlideUp 0.8s ease-out',
  },
  brandBar: {
    display: 'flex',
    justifyContent: 'center',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  logoBox: {
    width: '44px',
    height: '44px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 30px rgba(99, 102, 241, 0.3)',
  },
  brandName: {
    fontSize: '1.6rem',
    fontWeight: 800,
    letterSpacing: '-0.5px',
  },
  formCard: {
    position: 'relative',
    width: '520px',
    maxWidth: '100%',
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '28px',
    backdropFilter: 'blur(40px)',
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: '-40px',
    right: '-40px',
    width: '200px',
    height: '200px',
    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12), transparent 70%)',
    borderRadius: '50%',
    pointerEvents: 'none',
  },
  cardGlow2: {
    position: 'absolute',
    bottom: '-40px',
    left: '-40px',
    width: '200px',
    height: '200px',
    background: 'radial-gradient(circle, rgba(14, 165, 233, 0.08), transparent 70%)',
    borderRadius: '50%',
    pointerEvents: 'none',
  },
  formInner: {
    position: 'relative',
    padding: '2.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  formHeader: {
    textAlign: 'center',
  },
  formTitle: {
    color: '#f1f5f9',
    fontSize: '1.5rem',
    fontWeight: 800,
    margin: 0,
    letterSpacing: '-0.5px',
  },
  formSubtitle: {
    color: '#64748b',
    fontSize: '0.85rem',
    margin: '0.5rem 0 0',
  },
  steps: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  stepDot: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)',
    border: '2px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
  },
  stepActive: {
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    borderColor: '#818cf8',
    boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)',
  },
  stepNum: {
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  stepLine: {
    width: '60px',
    height: '2px',
    background: 'rgba(255,255,255,0.08)',
    transition: 'all 0.3s ease',
  },
  stepLineActive: {
    background: 'linear-gradient(to right, #6366f1, #4f46e5)',
  },
  stepLabel: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '0.8rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    borderRadius: '12px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    fontSize: '0.85rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  stepFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    color: '#94a3b8',
    fontSize: '0.72rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    fontSize: '14px',
    pointerEvents: 'none',
    zIndex: 1,
  },
  input: {
    width: '100%',
    padding: '13px 14px 13px 42px',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#e2e8f0',
    fontSize: '0.88rem',
    fontFamily: "'Inter', sans-serif",
    transition: 'all 0.3s ease',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  infoBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '14px 16px',
    borderRadius: '14px',
    background: 'rgba(99, 102, 241, 0.06)',
    border: '1px solid rgba(99, 102, 241, 0.12)',
    color: '#94a3b8',
    fontSize: '0.78rem',
    lineHeight: 1.5,
  },
  btnRow: {
    display: 'flex',
    gap: '0.75rem',
  },
  backBtn: {
    padding: '14px 20px',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#94a3b8',
    fontSize: '0.88rem',
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '14px',
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: 'white',
    fontSize: '0.9rem',
    fontWeight: 700,
    fontFamily: "'Inter', sans-serif",
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 30px rgba(99, 102, 241, 0.3)',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '0.5rem',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'rgba(255,255,255,0.06)',
  },
  dividerText: {
    color: '#475569',
    fontSize: '0.8rem',
    whiteSpace: 'nowrap',
  },
  loginLink: {
    display: 'block',
    textAlign: 'center',
    padding: '12px',
    borderRadius: '14px',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    background: 'rgba(99, 102, 241, 0.05)',
    color: '#818cf8',
    fontSize: '0.88rem',
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'all 0.3s ease',
  },
};
