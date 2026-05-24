import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import useAuthStore from '../context/authStore';
import GoogleLoginButton from '../components/auth/GoogleLoginButton';
import OTPInput from '../components/auth/OTPInput';
import useToast from '../hooks/useToast';

const RESEND_SECONDS = 10 * 60;

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}



export default function Login() {
  const router = useRouter();
  const { sendLoginOtp, verifyLoginOtp } = useAuthStore();
  const { toast } = useToast();

  const [tab, setTab] = useState('google');
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (router.query.error) {
      setError(decodeURIComponent(router.query.error));
    }
  }, [router.query.error]);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setError('');
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email');
      return;
    }
    setSending(true);
    try {
      await sendLoginOtp(email.trim().toLowerCase());
      setStep(2);
      setOtp('');
      setOtpError(false);
      setCountdown(RESEND_SECONDS);
      toast.success('Access code sent to your email');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send access code');
    } finally {
      setSending(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    await handleSendOtp();
  };

  const handleVerify = useCallback(async (code) => {
    if (verifying || code.length !== 6) return;
    setVerifying(true);
    setOtpError(false);
    setError('');
    try {
      await verifyLoginOtp(email.trim().toLowerCase(), code);
      setOtpSuccess(true);
      setTimeout(() => router.replace('/chats'), 400);
    } catch (err) {
      setOtpError(true);
      setError(err.response?.data?.error || 'Invalid access code');
      setOtp('');
    } finally {
      setVerifying(false);
    }
  }, [verifying, verifyLoginOtp, email, router]);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 pt-10 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="font-mono text-[10px] tracking-widest" style={{ color: '#6B6B8A' }}>SYS://AUTH</div>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #252535, transparent)' }} />
        </div>
        <h1 className="font-heading text-4xl font-bold tracking-wider" style={{ color: '#00F5FF', textShadow: '0 0 20px rgba(0,245,255,0.4)' }}>
          MAX
        </h1>
        <p className="font-mono text-xs tracking-widest mt-1" style={{ color: '#6B6B8A' }}>
          CONNECTIVITY PROTOCOL v2.0
        </p>
      </div>

      <div className="px-4 py-6 flex-1 flex flex-col justify-center">
        <div className="flex gap-2 mb-4">
          {['google', 'email'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setError(''); setStep(1); }}
              className="flex-1 py-2 rounded-sm font-mono text-[10px] tracking-widest transition-all"
              style={{
                background: tab === t ? 'rgba(0,245,255,0.12)' : '#12121A',
                border: tab === t ? '1px solid #00F5FF' : '1px solid #252535',
                color: tab === t ? '#00F5FF' : '#6B6B8A',
              }}
            >
              {t === 'google' ? 'GOOGLE ACCESS' : 'EMAIL ACCESS'}
            </button>
          ))}
        </div>

        <div className="p-6 rounded-sm corner-brackets" style={{ background: '#12121A', border: '1px solid #252535' }}>
          {tab === 'google' ? (
            <div className="flex flex-col items-center gap-6 py-4">
              <div className="text-center">
                <div className="font-mono text-xs tracking-widest mb-1" style={{ color: '#6B6B8A' }}>// GOOGLE OAUTH</div>
                <h2 className="font-heading text-xl font-semibold" style={{ color: '#E8E8FF' }}>GOOGLE ACCESS</h2>
              </div>
              <GoogleLoginButton />
            </div>
          ) : (
            <>
              <div className="mb-4">
                <div className="font-mono text-xs tracking-widest mb-1" style={{ color: '#6B6B8A' }}>
                  // EMAIL OTP — STEP {step}/2
                </div>
                <h2 className="font-heading text-xl font-semibold" style={{ color: '#E8E8FF' }}>EMAIL ACCESS</h2>
              </div>

              {step === 1 && (
                <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                  <div>
                    <label className="block font-mono text-[10px] tracking-widest mb-2" style={{ color: '#6B6B8A' }}>
                      OPERATOR EMAIL
                    </label>
                    <input
                      className="hud-input w-full px-3 py-3 rounded-sm text-sm"
                      type="email"
                      placeholder="op@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                  {error && <ErrorBanner message={error} />}
                  <button
                    type="submit"
                    disabled={sending}
                    className="hud-btn hud-btn-primary w-full py-3 rounded-sm text-sm"
                    style={{ opacity: sending ? 0.7 : 1 }}
                  >
                    {sending ? <LoadingDots label="SENDING..." /> : 'SEND ACCESS CODE'}
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
                    onComplete={handleVerify}
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
                      <button
                        type="button"
                        onClick={handleResend}
                        className="font-mono text-[10px] tracking-widest hover:underline"
                        style={{ color: '#00F5FF' }}
                      >
                        RESEND CODE
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setStep(1); setOtp(''); setError(''); }}
                    className="font-mono text-[10px] tracking-widest text-center w-full"
                    style={{ color: '#6B6B8A' }}
                  >
                    ← CHANGE EMAIL
                  </button>
                </div>
              )}
            </>
          )}

          <div className="mt-6 pt-4" style={{ borderTop: '1px solid #252535' }}>
            <p className="font-mono text-xs text-center" style={{ color: '#6B6B8A' }}>
              NEW OPERATOR?{' '}
              <Link href="/signup" className="transition-colors hover:underline" style={{ color: '#00F5FF' }}>
                REQUEST ACCESS
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div
      className="px-3 py-2 rounded-sm font-mono text-xs"
      style={{ background: 'rgba(255,0,110,0.1)', border: '1px solid rgba(255,0,110,0.3)', color: '#FF006E' }}
    >
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
