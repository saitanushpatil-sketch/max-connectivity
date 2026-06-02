import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import useAuthStore from '../context/authStore';

export default function Login() {
  const router = useRouter();
  const { ownerLogin } = useAuthStore();

  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [scanLine, setScanLine] = useState(true);
  const inputRef = useRef(null);

  useEffect(() => {
    if (router.query.error) {
      setError(decodeURIComponent(router.query.error));
    }
  }, [router.query.error]);

  // Auto-focus input
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 500);
  }, []);

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!passphrase.trim()) {
      setError('Enter access passphrase');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await ownerLogin(passphrase.trim());
      setScanLine(false);
      setTimeout(() => router.replace('/chats'), 300);
    } catch (err) {
      const msg = err.response?.data?.error || 'Authentication failed';
      const code = err.response?.data?.code;
      if (code === 'RATE_LIMITED') {
        setError(msg);
      } else if (code === 'INVALID_PASSPHRASE') {
        setError('INVALID PASSPHRASE — ACCESS DENIED');
      } else {
        setError(msg.toUpperCase());
      }
      setPassphrase('');
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* Animated scan line */}
      {scanLine && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 2, zIndex: 10,
          background: 'linear-gradient(90deg, transparent, #00F5FF, transparent)',
          animation: 'scanDown 3s linear infinite',
        }} />
      )}

      {/* Background grid effect */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        {/* Logo & Header */}
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 80, height: 80, borderRadius: 6,
            border: '2px solid #00F5FF',
            background: 'rgba(0,245,255,0.05)',
            boxShadow: '0 0 40px rgba(0,245,255,0.15), inset 0 0 20px rgba(0,245,255,0.05)',
            marginBottom: 20,
          }}>
            <span style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontWeight: 700, fontSize: 28, color: '#00F5FF',
              letterSpacing: 3,
            }}>MAX</span>
          </div>
          <div style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 10, letterSpacing: 3, color: '#6B6B8A',
            marginBottom: 6,
          }}>SYS://AUTH — JARVIS PROTOCOL</div>
          <h1 style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 28, fontWeight: 700, color: '#E8E8FF',
            margin: 0, letterSpacing: 2,
          }}>OPERATOR ACCESS</h1>
          <p style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 10, color: '#3A3A4A', marginTop: 6,
            letterSpacing: 2,
          }}>🔒 SINGLE-DEVICE SECURE LOGIN</p>
        </div>

        {/* Login Card */}
        <div style={{
          background: 'rgba(18,18,26,0.8)',
          border: '1px solid #252535',
          borderRadius: 4,
          padding: 24,
          position: 'relative',
          backdropFilter: 'blur(10px)',
        }}>
          {/* Corner brackets */}
          <div style={{ position: 'absolute', top: 4, left: 4, width: 12, height: 12, borderTop: '1.5px solid #00F5FF', borderLeft: '1.5px solid #00F5FF' }} />
          <div style={{ position: 'absolute', top: 4, right: 4, width: 12, height: 12, borderTop: '1.5px solid #00F5FF', borderRight: '1.5px solid #00F5FF' }} />
          <div style={{ position: 'absolute', bottom: 4, left: 4, width: 12, height: 12, borderBottom: '1.5px solid #00F5FF', borderLeft: '1.5px solid #00F5FF' }} />
          <div style={{ position: 'absolute', bottom: 4, right: 4, width: 12, height: 12, borderBottom: '1.5px solid #00F5FF', borderRight: '1.5px solid #00F5FF' }} />

          <form onSubmit={handleLogin}>
            <label style={{
              display: 'block',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: 10, letterSpacing: 3, color: '#6B6B8A',
              marginBottom: 10,
            }}>
              ACCESS PASSPHRASE
            </label>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#0A0A0F',
              border: `1px solid ${error ? '#FF006E' : '#252535'}`,
              borderRadius: 4,
              padding: '0 12px',
              transition: 'border-color 0.2s',
            }}>
              <span style={{ fontSize: 16, opacity: 0.5 }}>🔑</span>
              <input
                ref={inputRef}
                type={showPass ? 'text' : 'password'}
                value={passphrase}
                onChange={(e) => { setPassphrase(e.target.value); setError(''); }}
                placeholder="Enter passphrase..."
                autoComplete="off"
                spellCheck="false"
                style={{
                  flex: 1,
                  background: 'none', border: 'none', outline: 'none',
                  color: '#E8E8FF',
                  fontFamily: 'Share Tech Mono, monospace',
                  fontSize: 14, letterSpacing: 1,
                  padding: '14px 0',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#6B6B8A', fontSize: 14, padding: 4,
                }}
              >
                {showPass ? '👁️' : '🙈'}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                marginTop: 12, padding: '8px 12px', borderRadius: 4,
                background: 'rgba(255,0,110,0.1)',
                border: '1px solid rgba(255,0,110,0.3)',
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: 11, color: '#FF006E',
                letterSpacing: 1,
              }}>
                ⚠ {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !passphrase.trim()}
              style={{
                width: '100%', marginTop: 20,
                padding: '14px 0',
                background: loading ? 'rgba(0,245,255,0.1)' : 'rgba(0,245,255,0.15)',
                border: `1px solid ${loading ? '#00F5FF44' : '#00F5FF'}`,
                borderRadius: 4, cursor: loading ? 'default' : 'pointer',
                color: '#00F5FF',
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: 12, letterSpacing: 3, fontWeight: 600,
                boxShadow: loading ? 'none' : '0 0 20px rgba(0,245,255,0.15)',
                transition: 'all 0.2s',
                opacity: (!passphrase.trim() && !loading) ? 0.5 : 1,
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{ display: 'flex', gap: 4 }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: '#00F5FF',
                        animation: `bounceDot 1.4s ${i * 0.2}s infinite ease-in-out`,
                      }} />
                    ))}
                  </span>
                  AUTHENTICATING...
                </span>
              ) : 'AUTHENTICATE'}
            </button>
          </form>
        </div>

        {/* Security info */}
        <div style={{
          marginTop: 24, textAlign: 'center',
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: 9, color: '#3A3A4A', letterSpacing: 2,
          lineHeight: 1.8,
        }}>
          <div>● DEVICE-LOCKED SESSION</div>
          <div>● BRUTE-FORCE PROTECTED</div>
          <div>● OWNER ACCESS ONLY</div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div style={{
        padding: '12px 24px',
        borderTop: '1px solid #1A1A26',
        display: 'flex', justifyContent: 'space-between',
        fontFamily: 'Share Tech Mono, monospace',
        fontSize: 9, color: '#3A3A4A', letterSpacing: 1,
      }}>
        <span>MAX v2.0</span>
        <span>● SECURE</span>
      </div>

      <style jsx>{`
        @keyframes scanDown {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes bounceDot {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
