import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Avatar from '../components/ui/Avatar';
import BottomNav from '../components/ui/BottomNav';
import useAuthStore from '../context/authStore';
import usePushNotifications from '../hooks/usePushNotifications';
import api from '../utils/api';
import Skeleton from '../components/ui/Skeleton';

const COLORS = ['#00F5FF', '#FF006E', '#06D6A0', '#FFB703', '#8B5CF6', '#F97316', '#EC4899'];
const BADGES = {
  week_streak: { icon: '🔥', label: '7-DAY STREAK', color: '#F97316' },
  month_streak: { icon: '⚡', label: '30-DAY STREAK', color: '#FFB703' },
  meme_lord: { icon: '🎭', label: 'MEME LORD', color: '#8B5CF6' },
  early_adopter: { icon: '🚀', label: 'EARLY ADOPTER', color: '#00F5FF' },
  social_butterfly: { icon: '🦋', label: 'SOCIAL BUTTERFLY', color: '#EC4899' },
  meme_warrior: { icon: '⚔️', label: 'MEME WARRIOR', color: '#FF006E' },
  meme_champion: { icon: '🏆', label: 'MEME CHAMPION', color: '#FFB703' },
  undefeated: { icon: '👑', label: 'UNDEFEATED', color: '#00F5FF' },
};

export default function Profile() {
  const router = useRouter();
  const { user, updateUser, logout } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ displayName: user?.displayName || '', bio: user?.bio || '', avatarColor: user?.avatarColor || '#00F5FF' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pushLoading, setPushLoading] = useState(false);
  const { isSupported, isSubscribed, subscribe, unsubscribe, checkSubscribed } = usePushNotifications();

  useEffect(() => {
    if (user) checkSubscribed();
  }, [user, checkSubscribed]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put('/auth/profile', form);
      updateUser(data.user);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
    setSaving(false);
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const handlePushToggle = async () => {
    setPushLoading(true);
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
    setPushLoading(false);
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-full pb-16 overflow-y-auto">
      {/* Header */}
      <div className="px-4 pt-10 pb-3" style={{ borderBottom: '1px solid #252535' }}>
        <div className="font-mono text-[10px] tracking-widest mb-0.5" style={{ color: '#6B6B8A' }}>SYS://OPERATOR_ID</div>
        <h1 className="font-heading text-2xl font-bold tracking-wider" style={{ color: '#00F5FF', textShadow: '0 0 15px rgba(0,245,255,0.3)' }}>PROFILE</h1>
      </div>

      <div className="px-4 py-6 flex flex-col gap-4">
        {/* Avatar + basic info */}
        <div
          className="p-5 rounded-sm corner-brackets"
          style={{ background: '#12121A', border: '1px solid #252535' }}
        >
          <div className="flex items-center gap-4 mb-4">
            <Avatar user={user} size={72} showStatus />
            <div className="flex-1 min-w-0">
              <p className="font-heading text-xl font-bold" style={{ color: '#E8E8FF' }}>{user.displayName || user.username}</p>
              <p className="font-mono text-xs tracking-widest" style={{ color: '#6B6B8A' }}>@{user.username}</p>
              {user.bio && <p className="text-xs mt-1" style={{ color: '#B0B0C8' }}>{user.bio}</p>}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center py-3 rounded-sm" style={{ background: '#0A0A0F', border: '1px solid #252535' }}>
              <span style={{ fontSize: 22 }}>🔥</span>
              <span className="font-heading text-xl font-bold mt-1" style={{ color: '#F97316' }}>{user.streakCount}</span>
              <span className="font-mono text-[10px] tracking-widest" style={{ color: '#6B6B8A' }}>DAY STREAK</span>
            </div>
            <div className="flex flex-col items-center py-3 rounded-sm" style={{ background: '#0A0A0F', border: '1px solid #252535' }}>
              <span style={{ fontSize: 22 }}>🎭</span>
              <span className="font-heading text-xl font-bold mt-1" style={{ color: '#8B5CF6' }}>{user.totalMemesSent}</span>
              <span className="font-mono text-[10px] tracking-widest" style={{ color: '#6B6B8A' }}>MEMES SENT</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
          <div className="font-mono text-[10px] tracking-widest mb-3" style={{ color: '#6B6B8A' }}>// BATTLE STATS</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'WINS', val: user.battlesWon || 0, color: '#06D6A0' },
              { label: 'LOSSES', val: user.battlesLost || 0, color: '#FF006E' },
              { label: 'STREAK', val: user.battleWinStreak || 0, color: '#FFB703' },
            ].map(({ label, val, color }) => (
              <div key={label} className="text-center py-3 rounded-sm" style={{ background: '#0A0A0F', border: '1px solid #252535' }}>
                <span className="font-heading text-xl font-bold" style={{ color }}>{val}</span>
                <span className="block font-mono text-[9px] tracking-widest mt-1" style={{ color: '#6B6B8A' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
          <div className="font-mono text-[10px] tracking-widest mb-3" style={{ color: '#6B6B8A' }}>// GAME HIGH SCORES</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'QUIZ', val: `${user.quizHighScore || 0}/10`, color: '#00F5FF' },
              { label: 'REACT', val: user.reactionBestAvg ? `${user.reactionBestAvg}ms` : '—', color: '#06D6A0' },
              { label: 'MATCH', val: user.memeMatchBestTime ? `${user.memeMatchBestTime}s` : '—', color: '#FFB703' },
            ].map(({ label, val, color }) => (
              <div key={label} className="text-center py-3 rounded-sm" style={{ background: '#0A0A0F', border: '1px solid #252535' }}>
                <span className="font-heading text-lg font-bold" style={{ color }}>{val}</span>
                <span className="block font-mono text-[9px] tracking-widest mt-1" style={{ color: '#6B6B8A' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        {user.badges?.length > 0 && (
          <div className="p-4 rounded-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
            <div className="font-mono text-[10px] tracking-widest mb-3" style={{ color: '#6B6B8A' }}>// ACHIEVEMENTS</div>
            <div className="flex flex-wrap gap-2">
              {user.badges.map((badge, i) => {
                const b = BADGES[badge];
                if (!b) return null;
                return (
                  <div
                    key={badge}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm badge-bounce"
                    style={{
                      animationDelay: `${i * 0.08}s`,
                      background: `${b.color}11`,
                      border: `1px solid ${b.color}44`,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{b.icon}</span>
                    <span className="font-mono text-[10px] tracking-widest" style={{ color: b.color }}>{b.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Edit form */}
        {editing ? (
          <div className="p-4 rounded-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
            <div className="font-mono text-[10px] tracking-widest mb-4" style={{ color: '#6B6B8A' }}>// EDIT PROFILE</div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block font-mono text-[10px] tracking-widest mb-1.5" style={{ color: '#6B6B8A' }}>DISPLAY NAME</label>
                <input className="hud-input w-full px-3 py-2.5 rounded-sm text-sm" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} maxLength={40} />
              </div>
              <div>
                <label className="block font-mono text-[10px] tracking-widest mb-1.5" style={{ color: '#6B6B8A' }}>BIO</label>
                <textarea className="hud-input w-full px-3 py-2.5 rounded-sm text-sm resize-none" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={160} placeholder="Tell your squad about yourself..." />
              </div>
              <div>
                <label className="block font-mono text-[10px] tracking-widest mb-1.5" style={{ color: '#6B6B8A' }}>OPERATOR COLOR</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, avatarColor: c })}
                      className="w-8 h-8 rounded-sm transition-transform hover:scale-110"
                      style={{ background: c, border: form.avatarColor === c ? '2px solid white' : '2px solid transparent', boxShadow: form.avatarColor === c ? `0 0 12px ${c}` : 'none' }}
                    />
                  ))}
                </div>
              </div>

              {error && <div className="font-mono text-xs px-3 py-2 rounded-sm" style={{ background: 'rgba(255,0,110,0.1)', border: '1px solid rgba(255,0,110,0.3)', color: '#FF006E' }}>⚠ {error}</div>}

              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving} className="hud-btn hud-btn-primary flex-1 py-2.5 rounded-sm text-xs">
                  {saving ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
                <button onClick={() => { setEditing(false); setError(''); }} className="hud-btn hud-btn-ghost flex-1 py-2.5 rounded-sm text-xs">
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="hud-btn hud-btn-ghost w-full py-3 rounded-sm text-xs"
          >
            ✏ EDIT OPERATOR PROFILE
          </button>
        )}

        {/* Push notifications */}
        {isSupported && (
          <div
            className="p-4 rounded-sm corner-brackets"
            style={{ background: '#12121A', border: '1px solid #252535' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 flex items-center justify-center rounded-sm flex-shrink-0"
                  style={{
                    background: isSubscribed ? 'rgba(6,214,160,0.12)' : 'rgba(107,107,138,0.1)',
                    border: `1px solid ${isSubscribed ? 'rgba(6,214,160,0.4)' : '#252535'}`,
                    boxShadow: isSubscribed ? '0 0 12px rgba(6,214,160,0.25)' : 'none',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: isSubscribed ? '#06D6A0' : '#6B6B8A' }}>
                    <path d="M12 2C8.5 2 6 4.5 6 8V12L4 14V15H20V14L18 12V8C18 4.5 15.5 2 12 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                    <path d="M9 19H15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M10 22H14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="font-mono text-[10px] tracking-widest" style={{ color: '#6B6B8A' }}>// ALERTS</div>
                  <p className="font-heading text-sm font-semibold tracking-wider" style={{ color: isSubscribed ? '#06D6A0' : '#6B6B8A' }}>
                    NOTIFICATIONS {isSubscribed ? 'ON' : 'OFF'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePushToggle}
                disabled={pushLoading}
                className="relative w-12 h-6 rounded-sm flex-shrink-0 transition-all"
                style={{
                  background: isSubscribed ? 'rgba(6,214,160,0.2)' : '#0A0A0F',
                  border: `1px solid ${isSubscribed ? '#06D6A0' : '#252535'}`,
                  opacity: pushLoading ? 0.6 : 1,
                }}
                aria-pressed={isSubscribed}
                aria-label={`Notifications ${isSubscribed ? 'on' : 'off'}`}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 rounded-sm transition-all"
                  style={{
                    left: isSubscribed ? 'calc(100% - 22px)' : '2px',
                    background: isSubscribed ? '#06D6A0' : '#6B6B8A',
                    boxShadow: isSubscribed ? '0 0 8px rgba(6,214,160,0.6)' : 'none',
                  }}
                />
              </button>
            </div>
            <p className="font-mono text-[9px] tracking-widest mt-3" style={{ color: '#6B6B8A' }}>
              {isSubscribed
                ? 'INCOMING TRANSMISSIONS WILL ALERT THIS DEVICE'
                : 'ENABLE TO RECEIVE MESSAGES WHEN OFFLINE'}
            </p>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="hud-btn w-full py-3 rounded-sm text-xs font-mono tracking-widest"
          style={{ background: 'rgba(255,0,110,0.08)', border: '1px solid rgba(255,0,110,0.3)', color: '#FF006E' }}
        >
          ⏻ TERMINATE SESSION
        </button>

        {/* Version */}
        <div className="text-center">
          <span className="font-mono text-[10px] tracking-widest" style={{ color: '#3A3A4A' }}>MAX CONNECTIVITY v2.0</span>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
