import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Aurora from '../components/reactbits/Aurora';
import GradientText from '../components/reactbits/GradientText';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        login(data.token, data.doctor);
        navigate('/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Server not reachable. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      {/* Aurora Background */}
      <div style={styles.auroraWrap}>
        <Aurora
          colorStops={['#3b1f7e', '#4f46e5', '#0ea5e9']}
          amplitude={1.8}
          blend={0.6}
          speed={0.6}
        />
      </div>

      {/* Overlay gradient */}
      <div style={styles.overlay} />

      {/* Content */}
      <div style={styles.content}>
        {/* Left: Branding */}
        <div style={styles.leftPanel}>
          <div style={styles.brandGroup}>
            <div style={styles.logoBox}>
              <span style={{ fontSize: '36px' }}>🧠</span>
            </div>
            <GradientText
              colors={['#818cf8', '#38bdf8', '#a78bfa', '#818cf8']}
              animationSpeed={5}
            >
              <h1 style={styles.brandTitle}>NeuroScan AI</h1>
            </GradientText>
            <p style={styles.brandSubtitle}>Advanced EEG Diagnostic Platform</p>
          </div>

          <div style={styles.featureList}>
            {[
              { icon: '🔬', title: 'AI-Powered Analysis', desc: 'State-of-the-art ML model for EEG classification' },
              { icon: '🏥', title: 'Hospital-Grade Security', desc: 'Verified doctor access with institutional credentials' },
              { icon: '⚡', title: 'Instant Results', desc: 'Real-time schizophrenia risk assessment from EEG data' },
            ].map((f, i) => (
              <div key={i} style={styles.featureItem}>
                <div style={styles.featureIcon}>{f.icon}</div>
                <div>
                  <div style={styles.featureTitle}>{f.title}</div>
                  <div style={styles.featureDesc}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Login Form */}
        <div style={styles.formWrapper}>
          <div style={styles.formCard}>
            {/* Ambient glow */}
            <div style={styles.cardGlow} />

            <div style={styles.formInner}>
              <div style={styles.formHeader}>
                <h2 style={styles.formTitle}>Welcome Back</h2>
                <p style={styles.formSubtitle}>Sign in to access the diagnostic platform</p>
              </div>

              {error && (
                <div style={styles.errorBox}>
                  <span style={{ fontSize: '14px' }}>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Email Address</label>
                  <div style={styles.inputWrapper}>
                    <span style={styles.inputIcon}>✉️</span>
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="doctor@hospital.com"
                      required
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Password</label>
                  <div style={styles.inputWrapper}>
                    <span style={styles.inputIcon}>🔒</span>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      style={styles.input}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={styles.showPassBtn}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <button
                  id="login-submit"
                  type="submit"
                  disabled={loading}
                  style={{
                    ...styles.submitBtn,
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? (
                    <div style={styles.spinner} />
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <div style={styles.divider}>
                <div style={styles.dividerLine} />
                <span style={styles.dividerText}>New to NeuroScan?</span>
                <div style={styles.dividerLine} />
              </div>

              <Link to="/register" style={styles.registerLink}>
                Create Doctor Account →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        * { box-sizing: border-box; }

        input::placeholder {
          color: #475569;
        }
        input:focus {
          outline: none;
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15), 0 0 20px rgba(99, 102, 241, 0.1) !important;
        }
        button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 40px rgba(99, 102, 241, 0.4) !important;
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
    opacity: 0.5,
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
    background: 'linear-gradient(to bottom, rgba(8,11,20,0.5), rgba(8,11,20,0.8))',
  },
  content: {
    position: 'relative',
    zIndex: 2,
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5rem',
    padding: '2rem 4rem',
    flexWrap: 'wrap',
  },
  leftPanel: {
    maxWidth: '480px',
    display: 'flex',
    flexDirection: 'column',
    gap: '3rem',
    animation: 'fadeSlideUp 0.8s ease-out',
  },
  brandGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  logoBox: {
    width: '68px',
    height: '68px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 50px rgba(99, 102, 241, 0.3)',
  },
  brandTitle: {
    fontSize: '2.8rem',
    fontWeight: 900,
    margin: 0,
    letterSpacing: '-1px',
  },
  brandSubtitle: {
    color: '#64748b',
    fontSize: '1rem',
    margin: 0,
    fontWeight: 400,
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    padding: '1rem',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
    backdropFilter: 'blur(10px)',
  },
  featureIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: 'rgba(99, 102, 241, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    flexShrink: 0,
  },
  featureTitle: {
    color: '#e2e8f0',
    fontWeight: 600,
    fontSize: '0.9rem',
    marginBottom: '2px',
  },
  featureDesc: {
    color: '#64748b',
    fontSize: '0.8rem',
    lineHeight: 1.4,
  },
  formWrapper: {
    animation: 'fadeSlideUp 0.8s ease-out 0.2s backwards',
  },
  formCard: {
    position: 'relative',
    width: '420px',
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
    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15), transparent 70%)',
    borderRadius: '50%',
    pointerEvents: 'none',
  },
  formInner: {
    position: 'relative',
    padding: '2.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  formHeader: {
    textAlign: 'center',
    marginBottom: '0.5rem',
  },
  formTitle: {
    color: '#f1f5f9',
    fontSize: '1.6rem',
    fontWeight: 800,
    margin: 0,
    letterSpacing: '-0.5px',
  },
  formSubtitle: {
    color: '#64748b',
    fontSize: '0.85rem',
    margin: '0.5rem 0 0',
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
    gap: '1.25rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    color: '#94a3b8',
    fontSize: '0.75rem',
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
    padding: '14px 14px 14px 42px',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#e2e8f0',
    fontSize: '0.9rem',
    fontFamily: "'Inter', sans-serif",
    transition: 'all 0.3s ease',
  },
  showPassBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
  },
  submitBtn: {
    width: '100%',
    padding: '15px',
    borderRadius: '14px',
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: 'white',
    fontSize: '0.95rem',
    fontWeight: 700,
    fontFamily: "'Inter', sans-serif",
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 30px rgba(99, 102, 241, 0.3)',
    marginTop: '0.5rem',
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
  registerLink: {
    display: 'block',
    textAlign: 'center',
    padding: '13px',
    borderRadius: '14px',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    background: 'rgba(99, 102, 241, 0.05)',
    color: '#818cf8',
    fontSize: '0.9rem',
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'all 0.3s ease',
  },
};
