import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import useAuthStore from '../context/authStore';
import GoogleLoginButton from '../components/auth/GoogleLoginButton';
import OTPInput from '../components/auth/OTPInput';
import useToast from '../hooks/useToast';

const COLORS = ['#00F5FF', '#FF006E', '#06D6A0', '#FFB703', '#8B5CF6', '#F97316', '#EC4899'];
const RESEND_SECONDS = 10 * 60;

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const getServerSideProps = async () => ({ props: {} });

export default function Signup() {
  const router = useRouter();
  const { sendSignupOtp, verifySignupOtp, signup } = useAuthStore();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [verifiedEmailToken, setVerifiedEmailToken] = useState('');
  const [form, setForm] = useState({ username: '', displayName: '', avatarColor: '#00F5FF' });
  const [error, setError] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [creating, setCreating] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email');
      return;
    }
    setSending(true);
    try {
      await sendSignupOtp(email.trim().toLowerCase());
      setStep(2);
      setOtp('');
      setOtpError(false);
      setCountdown(RESEND_SECONDS);
      toast.success('Verification code sent to your email');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send verification code');
    } finally {
      setSending(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setSending(true);
    try {
      await sendSignupOtp(email.trim().toLowerCase());
      setCountdown(RESEND_SECONDS);
      toast.success('Verification code resent');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code');
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = useCallback(async (code) => {
    if (verifying || code.length !== 6) return;
    setVerifying(true);
    setOtpError(false);
    setError('');
    try {
      const data = await verifySignupOtp(email.trim().toLowerCase(), code);
      setVerifiedEmailToken(data.verifiedEmailToken);
      setOtpSuccess(true);
      setTimeout(() => {
        setStep(3);
        setOtpSuccess(false);
      }, 400);
    } catch (err) {
      setOtpError(true);
      setError(err.response?.data?.error || 'Invalid verification code');
      setOtp('');
    } finally {
      setVerifying(false);
    }
  }, [verifying, verifySignupOtp, email]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username)) {
      setError('Username: 3-20 chars, letters/numbers/underscores only');
      return;
    }
    setCreating(true);
    try {
      await signup({
        username: form.username.toLowerCase(),
        email: email.trim().toLowerCase(),
        displayName: form.displayName || form.username,
        avatarColor: form.avatarColor,
        verifiedEmailToken,
      });
      router.replace('/chats');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 pt-10 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="font-mono text-[10px] tracking-widest" style={{ color: '#6B6B8A' }}>SYS://REGISTER</div>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #252535, transparent)' }} />
        </div>
        <h1 className="font-heading text-4xl font-bold tracking-wider" style={{ color: '#00F5FF', textShadow: '0 0 20px rgba(0,245,255,0.4)' }}>
          MAX
        </h1>
        <p className="font-mono text-xs tracking-widest mt-1" style={{ color: '#6B6B8A' }}>CREATE OPERATOR PROFILE</p>
      </div>

      <div className="px-4 py-4 flex-1">
        <div className="p-6 rounded-sm corner-brackets" style={{ background: '#12121A', border: '1px solid #252535' }}>
          <div className="mb-4">
            <div className="font-mono text-xs tracking-widest mb-1" style={{ color: '#6B6B8A' }}>
              // REGISTRATION — STEP {step}/3
            </div>
            <h2 className="font-heading text-xl font-semibold" style={{ color: '#E8E8FF' }}>
              {step === 1 && 'VERIFY EMAIL'}
              {step === 2 && 'ENTER CODE'}
              {step === 3 && 'OPERATOR PROFILE'}
            </h2>
          </div>

          {step === 1 && (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <div>
                <label className="block font-mono text-[10px] tracking-widest mb-2" style={{ color: '#6B6B8A' }}>EMAIL *</label>
                <input
                  className="hud-input w-full px-3 py-3 rounded-sm text-sm"
                  type="email"
                  placeholder="op@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {error && <ErrorBanner message={error} />}
              <button type="submit" disabled={sending} className="hud-btn hud-btn-primary w-full py-3 rounded-sm text-sm" style={{ opacity: sending ? 0.7 : 1 }}>
                {sending ? <LoadingDots label="SENDING..." /> : 'SEND VERIFICATION CODE'}
              </button>
            </form>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <p className="font-mono text-[10px] tracking-widest text-center" style={{ color: '#6B6B8A' }}>
                CODE SENT TO {email.toUpperCase()}
              </p>
              <p className="font-mono text-[10px] tracking-widest text-center mb-1" style={{ color: '#00F5FF' }}>
                VERIFICATION SYSTEM
              </p>
              <OTPInput
                value={otp}
                onChange={setOtp}
                onComplete={handleVerifyOtp}
                error={otpError}
                success={otpSuccess}
                disabled={verifying || otpSuccess}
              />
              {verifying && (
                <p className="font-mono text-[10px] tracking-widest text-center" style={{ color: '#6B6B8A' }}>
                  <LoadingDots label="VERIFYING..." />
                </p>
              )}
              {error && <ErrorBanner message={error} />}
              <div className="text-center">
                {countdown > 0 ? (
                  <p className="font-mono text-[10px] tracking-widest" style={{ color: '#6B6B8A' }}>
                    Resend in {formatCountdown(countdown)}
                  </p>
                ) : (
                  <button type="button" onClick={handleResend} disabled={sending} className="font-mono text-[10px] tracking-widest hover:underline" style={{ color: '#00F5FF' }}>
                    RESEND CODE
                  </button>
                )}
              </div>
              <button type="button" onClick={() => { setStep(1); setOtp(''); setError(''); }} className="font-mono text-[10px] tracking-widest text-center w-full" style={{ color: '#6B6B8A' }}>
                ← CHANGE EMAIL
              </button>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="block font-mono text-[10px] tracking-widest mb-2" style={{ color: '#6B6B8A' }}>OPERATOR COLOR</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, avatarColor: c })}
                      className="w-8 h-8 rounded-sm transition-transform hover:scale-110"
                      style={{
                        background: c,
                        border: form.avatarColor === c ? '2px solid white' : '2px solid transparent',
                        boxShadow: form.avatarColor === c ? `0 0 12px ${c}` : 'none',
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <div
                    className="w-10 h-10 rounded-sm flex items-center justify-center font-heading font-bold text-sm"
                    style={{
                      background: `${form.avatarColor}22`,
                      border: `1.5px solid ${form.avatarColor}66`,
                      color: form.avatarColor,
                      boxShadow: `0 0 10px ${form.avatarColor}33`,
                    }}
                  >
                    {(form.displayName || form.username || '?')[0]?.toUpperCase()}
                  </div>
                  <span className="font-mono text-xs" style={{ color: '#6B6B8A' }}>AVATAR PREVIEW</span>
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] tracking-widest mb-2" style={{ color: '#6B6B8A' }}>USERNAME *</label>
                <input
                  className="hud-input w-full px-3 py-3 rounded-sm text-sm"
                  placeholder="operator_name"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                  required
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] tracking-widest mb-2" style={{ color: '#6B6B8A' }}>DISPLAY NAME</label>
                <input
                  className="hud-input w-full px-3 py-3 rounded-sm text-sm"
                  placeholder="Iron Man (optional)"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                />
              </div>

              {error && <ErrorBanner message={error} />}
              <button type="submit" disabled={creating} className="hud-btn hud-btn-primary w-full py-3 rounded-sm text-sm" style={{ opacity: creating ? 0.7 : 1 }}>
                {creating ? <LoadingDots label="CREATING..." /> : 'CREATE OPERATOR'}
              </button>
            </form>
          )}

          <div className="flex items-center gap-3 my-4">
            <div style={{ flex: 1, height: 1, background: '#252535' }} />
            <span className="font-mono text-[10px] tracking-widest" style={{ color: '#6B6B8A' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: '#252535' }} />
          </div>
          <GoogleLoginButton />

          <div className="mt-4 pt-4" style={{ borderTop: '1px solid #252535' }}>
            <p className="font-mono text-xs text-center" style={{ color: '#6B6B8A' }}>
              ALREADY REGISTERED?{' '}
              <Link href="/login" style={{ color: '#00F5FF' }} className="hover:underline">AUTHENTICATE</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div className="px-3 py-2 rounded-sm font-mono text-xs" style={{ background: 'rgba(255,0,110,0.1)', border: '1px solid rgba(255,0,110,0.3)', color: '#FF006E' }}>
      ⚠ {String(message).toUpperCase()}
    </div>
  );
}

function LoadingDots({ label }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
      {label && <span>{label}</span>}
    </span>
  );
}
