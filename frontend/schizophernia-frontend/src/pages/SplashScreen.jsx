import { useState, useEffect } from 'react';
import Particles from '../components/reactbits/Particles';
import GradientText from '../components/reactbits/GradientText';

export default function SplashScreen({ onComplete }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
    }, 1800);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => {
      clearTimeout(timer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#080b14',
        transition: 'opacity 0.7s ease-out',
        opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? 'none' : 'auto',
      }}
    >
      {/* Particles Background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <Particles
          particleCount={300}
          particleSpread={12}
          speed={0.08}
          particleColors={['#6366f1', '#818cf8', '#a5b4fc', '#4f46e5', '#38bdf8']}
          alphaParticles={true}
          particleBaseSize={120}
          sizeRandomness={1.5}
          cameraDistance={22}
          moveParticlesOnHover={true}
          particleHoverFactor={0.6}
        />
      </div>

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          animation: 'splashIn 1s ease-out forwards',
        }}
      >
        {/* Brain Icon */}
        <div
          style={{
            width: '90px',
            height: '90px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '44px',
            boxShadow: '0 0 60px rgba(99, 102, 241, 0.4), 0 0 120px rgba(99, 102, 241, 0.2)',
            animation: 'splashPulse 2s ease-in-out infinite',
          }}
        >
          🧠
        </div>

        <GradientText
          colors={['#818cf8', '#38bdf8', '#a78bfa', '#818cf8']}
          animationSpeed={4}
        >
          <h1
            style={{
              fontSize: '3rem',
              fontWeight: 900,
              letterSpacing: '-1px',
              margin: 0,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            NeuroScan AI
          </h1>
        </GradientText>

        <p
          style={{
            color: '#94a3b8',
            fontSize: '0.85rem',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            fontWeight: 600,
            margin: 0,
          }}
        >
          Diagnostic EEG Platform
        </p>

        {/* Loading dots */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '1rem' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#6366f1',
                animation: `splashDot 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes splashIn {
          from {
            opacity: 0;
            transform: scale(0.85) translateY(30px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes splashPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 60px rgba(99, 102, 241, 0.4); }
          50% { transform: scale(1.05); box-shadow: 0 0 80px rgba(99, 102, 241, 0.6); }
        }
        @keyframes splashDot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
