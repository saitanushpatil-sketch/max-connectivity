import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import useAuthStore from '../context/authStore';
import GoogleLoginButton from '../components/auth/GoogleLoginButton';

const COLORS = ['#00F5FF', '#FF006E', '#06D6A0', '#FFB703', '#8B5CF6', '#F97316', '#EC4899'];

export default function Signup() {
  const router = useRouter();
  const { signup } = useAuthStore();
  const [form, setForm] = useState({ username: '', email: '', password: '', displayName: '', avatarColor: '#00F5FF' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username)) {
      return setError('Username: 3-20 chars, letters/numbers/underscores only');
    }
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      await signup(form);
      router.replace('/chats');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
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
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Avatar color */}
            <div>
              <label className="block font-mono text-[10px] tracking-widest mb-2" style={{ color: '#6B6B8A' }}>
                OPERATOR COLOR
              </label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, avatarColor: c })}
                    className="w-8 h-8 rounded-sm transition-transform hover:scale-110"
                    style={{
                      background: c,
                      border: form.avatarColor === c ? `2px solid white` : '2px solid transparent',
                      boxShadow: form.avatarColor === c ? `0 0 12px ${c}` : 'none',
                    }}
                  />
                ))}
              </div>
              {/* Preview */}
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
              <label className="block font-mono text-[10px] tracking-widest mb-2" style={{ color: '#6B6B8A' }}>EMAIL *</label>
              <input
                className="hud-input w-full px-3 py-3 rounded-sm text-sm"
                type="email"
                placeholder="op@domain.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
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

            <div>
              <label className="block font-mono text-[10px] tracking-widest mb-2" style={{ color: '#6B6B8A' }}>SECURITY KEY *</label>
              <input
                className="hud-input w-full px-3 py-3 rounded-sm text-sm"
                type="password"
                placeholder="min 6 chars"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            {error && (
              <div className="px-3 py-2 rounded-sm font-mono text-xs" style={{ background: 'rgba(255,0,110,0.1)', border: '1px solid rgba(255,0,110,0.3)', color: '#FF006E' }}>
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
              ) : 'CREATE OPERATOR'}
            </button>

            <div className="flex items-center gap-3 my-1">
              <div style={{ flex: 1, height: 1, background: '#252535' }} />
              <span className="font-mono text-[10px] tracking-widest" style={{ color: '#6B6B8A' }}>OR</span>
              <div style={{ flex: 1, height: 1, background: '#252535' }} />
            </div>

            <GoogleLoginButton />
          </form>

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
