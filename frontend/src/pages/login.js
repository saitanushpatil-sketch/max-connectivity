import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import useAuthStore from '../context/authStore';
import GoogleLoginButton from '../components/auth/GoogleLoginButton';

export default function Login() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (router.query.error) {
      setError(decodeURIComponent(router.query.error));
    }
  }, [router.query.error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.identifier, form.password);
      router.replace('/chats');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Top HUD bar */}
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

      {/* Corner decoration */}
      <div className="px-4 py-6 flex-1 flex flex-col justify-center">
        <div
          className="p-6 rounded-sm corner-brackets"
          style={{ background: '#12121A', border: '1px solid #252535' }}
        >
          <div className="mb-6">
            <div className="font-mono text-xs tracking-widest mb-1" style={{ color: '#6B6B8A' }}>// AUTHENTICATION REQUIRED</div>
            <h2 className="font-heading text-xl font-semibold" style={{ color: '#E8E8FF' }}>ACCESS TERMINAL</h2>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block font-mono text-[10px] tracking-widest mb-2" style={{ color: '#6B6B8A' }}>
                IDENTIFIER — EMAIL OR USERNAME
              </label>
              <input
                className="hud-input w-full px-3 py-3 rounded-sm text-sm"
                placeholder="user@domain.com or username"
                value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] tracking-widest mb-2" style={{ color: '#6B6B8A' }}>
                SECURITY KEY
              </label>
              <input
                className="hud-input w-full px-3 py-3 rounded-sm text-sm"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div
                className="px-3 py-2 rounded-sm font-mono text-xs"
                style={{ background: 'rgba(255,0,110,0.1)', border: '1px solid rgba(255,0,110,0.3)', color: '#FF006E' }}
              >
                ⚠ {error.toUpperCase()}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="hud-btn hud-btn-primary w-full py-3 rounded-sm text-sm"
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                </span>
              ) : 'AUTHENTICATE'}
            </button>

            <div className="flex items-center gap-3 my-1">
              <div style={{ flex: 1, height: 1, background: '#252535' }} />
              <span className="font-mono text-[10px] tracking-widest" style={{ color: '#6B6B8A' }}>OR</span>
              <div style={{ flex: 1, height: 1, background: '#252535' }} />
            </div>

            <GoogleLoginButton />
          </form>

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

      {/* Bottom status bar */}
      <div className="px-4 pb-8">
        <div className="flex items-center gap-2">
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#06D6A0', boxShadow: '0 0 6px #06D6A0' }} />
          <span className="font-mono text-[10px] tracking-widest" style={{ color: '#6B6B8A' }}>SYSTEMS NOMINAL</span>
        </div>
      </div>
    </div>
  );
}
