import { useState } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { signInWithGoogle, signInWithEmail, registerWithEmail, auth } from '../lib/firebase';
import { useAuthStore } from '../context/authStore';

export default function Login() {
  const router = useRouter();
  const { loginWithFirebase } = useAuthStore();
  const [mode, setMode] = useState('login'); // login | register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      const firebaseUser = await signInWithGoogle();
      const token = await firebaseUser.getIdToken();
      await loginWithFirebase(token, firebaseUser);
      router.push('/chats');
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Email and password are required');
      setLoading(false);
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      let firebaseUser;
      if (mode === 'register') {
        firebaseUser = await registerWithEmail(email, password);
        setSuccess('Account created! Please verify your email then login.');
        setMode('login');
        setLoading(false);
        return;
      } else {
        firebaseUser = await signInWithEmail(email, password);
      }

      const token = await firebaseUser.getIdToken();
      await loginWithFirebase(token, firebaseUser);
      router.push('/chats');
    } catch (err) {
      const msg = err.code === 'auth/user-not-found' ? 'No account found with this email' :
                  err.code === 'auth/wrong-password' ? 'Incorrect password' :
                  err.code === 'auth/email-already-in-use' ? 'Email already registered' :
                  err.code === 'auth/invalid-email' ? 'Invalid email address' :
                  err.message.replace('Firebase: ', '');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', background: 'rgba(37,37,53,0.8)',
    border: '1px solid #252535', borderRadius: 12,
    padding: '14px 16px', color: '#E8E8FF',
    fontFamily: 'Exo 2', fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  const btnStyle = (primary) => ({
    width: '100%', padding: '14px',
    background: primary ? 'linear-gradient(135deg, rgba(0,245,255,0.2), rgba(255,0,110,0.2))' : 'transparent',
    border: `1px solid ${primary ? '#00F5FF' : '#252535'}`,
    borderRadius: 12, color: primary ? '#00F5FF' : '#6B6B8A',
    fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 15,
    letterSpacing: 2, cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
    transition: 'all 0.2s',
    boxSizing: 'border-box',
  });

  return (
    <div style={{
      minHeight: '100vh', background: '#0A0A0F',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Exo 2', padding: 20,
      backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(0,245,255,0.05) 0%, transparent 60%)',
    }}>
      {/* HUD grid overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: '100%', maxWidth: 400,
          background: 'rgba(18,18,26,0.95)',
          border: '1px solid #252535', borderRadius: 24,
          padding: 32, position: 'relative',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 0 60px rgba(0,245,255,0.05)',
        }}
      >
        {/* Corner brackets */}
        {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
          <div key={`${v}${h}`} style={{
            position: 'absolute', [v]: 12, [h]: 12,
            width: 16, height: 16,
            borderTop: v === 'top' ? '2px solid #00F5FF' : 'none',
            borderBottom: v === 'bottom' ? '2px solid #00F5FF' : 'none',
            borderLeft: h === 'left' ? '2px solid #00F5FF' : 'none',
            borderRight: h === 'right' ? '2px solid #00F5FF' : 'none',
          }} />
        ))}

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <motion.div
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
            style={{ fontSize: 36, fontFamily: 'Rajdhani', fontWeight: 800, color: '#00F5FF', letterSpacing: 6 }}
          >
            MAX
          </motion.div>
          <div style={{ fontSize: 11, color: '#6B6B8A', letterSpacing: 3 }}>CONNECTIVITY PROTOCOL v3.0</div>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }}
              style={{
                flex: 1, padding: '10px',
                background: mode === m ? 'rgba(0,245,255,0.1)' : 'transparent',
                border: `1px solid ${mode === m ? '#00F5FF' : '#252535'}`,
                borderRadius: 10, color: mode === m ? '#00F5FF' : '#6B6B8A',
                fontFamily: 'Rajdhani', fontWeight: 600, fontSize: 13,
                letterSpacing: 2, cursor: 'pointer',
              }}>
              {m === 'login' ? 'SIGN IN' : 'REGISTER'}
            </button>
          ))}
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email" placeholder="Email address"
            value={email} onChange={e => setEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password" placeholder="Password"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
            style={inputStyle}
          />
          <AnimatePresence>
            {mode === 'register' && (
              <motion.input
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                type="password" placeholder="Confirm password"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                style={inputStyle}
              />
            )}
          </AnimatePresence>

          {/* Error/Success */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ background: 'rgba(255,0,110,0.1)', border: '1px solid #FF006E33',
                  borderRadius: 8, padding: '10px 12px', color: '#FF006E', fontSize: 13 }}>
                ⚠ {error}
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ background: 'rgba(6,214,160,0.1)', border: '1px solid #06D6A033',
                  borderRadius: 8, padding: '10px 12px', color: '#06D6A0', fontSize: 13 }}>
                ✓ {success}
              </motion.div>
            )}
          </AnimatePresence>

          <button onClick={handleEmailAuth} disabled={loading} style={btnStyle(true)}>
            {loading ? 'AUTHENTICATING...' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#252535' }} />
            <span style={{ color: '#6B6B8A', fontSize: 11, letterSpacing: 2 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: '#252535' }} />
          </div>

          {/* Google */}
          <button onClick={handleGoogle} disabled={loading} style={btnStyle(false)}>
            <span style={{ marginRight: 8 }}>G</span> CONTINUE WITH GOOGLE
          </button>
        </div>
      </motion.div>
    </div>
  );
}
