import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import useAuthStore from '../context/authStore';
import BottomNav from '../components/ui/BottomNav';
import Avatar from '../components/ui/Avatar';
import api from '../utils/api';
import hapticTap from '../utils/haptic';

const COLORS = ['#00F5FF','#FF006E','#06D6A0',
                '#FFB703','#8B5CF6','#F97316','#EC4899'];

const BADGES = {
  week_streak: { icon: '🔥', label: '7-DAY STREAK', color: '#F97316' },
  month_streak: { icon: '⚡', label: '30-DAY STREAK', color: '#FFB703' },
  meme_lord: { icon: '🎭', label: 'MEME LORD', color: '#8B5CF6' },
  early_adopter: { icon: '🚀', label: 'EARLY ADOPTER', color: '#00F5FF' },
  social_butterfly: { icon: '🦋', label: 'SOCIAL BUTTERFLY', color: '#EC4899' },
  meme_warrior: { icon: '⚔️', label: 'MEME WARRIOR', color: '#FF006E' },
  meme_champion: { icon: '🏆', label: 'MEME CHAMPION', color: '#FFD700' },
};

const VIBES = [
  { key: 'available', emoji: '🟢', label: 'AVAILABLE', color: '#06D6A0' },
  { key: 'gaming', emoji: '🎮', label: 'GAMING', color: '#8B5CF6' },
  { key: 'listening', emoji: '🎵', label: 'LISTENING', color: '#00F5FF' },
  { key: 'dnd', emoji: '😴', label: 'DO NOT DISTURB', color: '#FF006E' },
  { key: 'ghost', emoji: '👻', label: 'GHOST MODE', color: '#6B6B8A' },
  { key: 'on-fire', emoji: '🔥', label: 'ON FIRE', color: '#F97316' },
  { key: 'chillin', emoji: '☕', label: 'CHILLIN', color: '#FFB703' },
];

const GAME_SCORES = [
  { key: 'score2048', label: '2048', icon: '🎮' },
  { key: 'scoreReaction', label: 'REACTION', icon: '⚡' },
  { key: 'scoreDesiQuiz', label: 'DESI QUIZ', icon: '🎬' },
  { key: 'scoreCarRacer', label: 'CAR RACER', icon: '🏎️' },
  { key: 'scoreSpaceShooter', label: 'SPACE', icon: '🚀' },
  { key: 'scoreTicTacToe', label: 'TIC TAC', icon: '✕○' },
];

export default function Profile() {
  const router = useRouter();
  const { user, updateUser, logout } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    displayName: '',
    bio: '',
    avatarColor: '#00F5FF'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [currentVibe, setCurrentVibe] = useState('available');
  const [vibeLoading, setVibeLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        displayName: user.displayName || '',
        bio: user.bio || '',
        avatarColor: user.avatarColor || '#00F5FF'
      });
      setCurrentVibe(user.vibe || 'available');
    }
  }, [user]);

  const handleSetVibe = useCallback(async (vibe) => {
    hapticTap(6);
    setVibeLoading(true);
    setCurrentVibe(vibe);
    try {
      const { data } = await api.put('/users/vibe', { vibe });
      if (data.user) updateUser(data.user);
    } catch (err) {
      setCurrentVibe(user?.vibe || 'available');
    }
    setVibeLoading(false);
  }, [user, updateUser]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put('/auth/profile', form);
      updateUser(data.user);
      setEditing(false);
    } catch (err) {
      setError(err?.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = useCallback(() => {
    logout();
    router.replace('/login');
  }, [logout, router]);

  if (!user) {
    return (
      <div style={{
        height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#0A0A0F'
      }}>
        <div style={{ color: '#6B6B8A', fontFamily: 'Share Tech Mono' }}>
          LOADING OPERATOR DATA...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-16 overflow-y-auto">
      {/* Header */}
      <div className="px-4 pt-10 pb-3"
        style={{ borderBottom: '1px solid #252535' }}>
        <div className="font-mono text-[10px] tracking-widest mb-0.5"
          style={{ color: '#6B6B8A' }}>SYS://OPERATOR_ID</div>
        <h1 className="font-heading text-2xl font-bold tracking-wider"
          style={{ color: '#00F5FF' }}>PROFILE</h1>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Avatar + Info */}
        <div className="p-5 rounded-sm"
          style={{ background: '#12121A', border: '1px solid #252535' }}>
          <div className="flex items-center gap-4 mb-4">
            <Avatar user={{...user, vibe: currentVibe}} size={72} showStatus showVibe />
            <div className="flex-1 min-w-0">
              <p className="font-heading text-xl font-bold"
                style={{ color: '#E8E8FF' }}>
                {user.displayName || user.username}
              </p>
              <p className="font-mono text-xs tracking-widest"
                style={{ color: '#6B6B8A' }}>@{user.username}</p>
              {user.bio && (
                <p className="text-xs mt-1" style={{ color: '#B0B0C8' }}>
                  {user.bio}
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center py-3 rounded-sm"
              style={{ background: '#0A0A0F', border: '1px solid #252535' }}>
              <span style={{ fontSize: 22 }}>🔥</span>
              <span className="font-heading text-xl font-bold mt-1"
                style={{ color: '#F97316' }}>
                {user.streakCount || 0}
              </span>
              <span className="font-mono text-[10px] tracking-widest"
                style={{ color: '#6B6B8A' }}>DAY STREAK</span>
            </div>
            <div className="flex flex-col items-center py-3 rounded-sm"
              style={{ background: '#0A0A0F', border: '1px solid #252535' }}>
              <span style={{ fontSize: 22 }}>🎭</span>
              <span className="font-heading text-xl font-bold mt-1"
                style={{ color: '#8B5CF6' }}>
                {user.totalMemesSent || 0}
              </span>
              <span className="font-mono text-[10px] tracking-widest"
                style={{ color: '#6B6B8A' }}>GIFS SENT</span>
            </div>
          </div>
        </div>

        {/* Vibe Status */}
        <div className="p-4 rounded-sm"
          style={{ background: '#12121A', border: '1px solid #252535' }}>
          <div className="font-mono text-[10px] tracking-widest mb-3"
            style={{ color: '#6B6B8A' }}>// SET YOUR VIBE</div>
          <div className="flex flex-wrap gap-2">
            {VIBES.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => handleSetVibe(v.key)}
                disabled={vibeLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-sm transition-all"
                style={{
                  background: currentVibe === v.key ? `${v.color}18` : '#0A0A0F',
                  border: `1px solid ${currentVibe === v.key ? v.color : '#252535'}`,
                  color: currentVibe === v.key ? v.color : '#6B6B8A',
                  boxShadow: currentVibe === v.key ? `0 0 10px ${v.color}22` : 'none',
                  opacity: vibeLoading ? 0.7 : 1,
                }}
              >
                <span style={{ fontSize: 14 }}>{v.emoji}</span>
                <span className="font-mono text-[9px] tracking-widest">{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Game Scores */}
        <div className="p-4 rounded-sm"
          style={{ background: '#12121A', border: '1px solid #252535' }}>
          <div className="font-mono text-[10px] tracking-widest mb-3"
            style={{ color: '#6B6B8A' }}>// GAME SCORES</div>
          <div className="grid grid-cols-3 gap-2">
            {GAME_SCORES.map(({ key, label, icon }) => (
              <div key={key} className="flex flex-col items-center py-2 rounded-sm"
                style={{ background: '#0A0A0F', border: '1px solid #252535' }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span className="font-heading font-bold mt-1"
                  style={{ color: '#00F5FF', fontSize: 14 }}>
                  {user?.gameScores?.[key] || 0}
                </span>
                <span className="font-mono text-[9px] tracking-widest text-center"
                  style={{ color: '#6B6B8A' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        {user.badges?.length > 0 && (
          <div className="p-4 rounded-sm"
            style={{ background: '#12121A', border: '1px solid #252535' }}>
            <div className="font-mono text-[10px] tracking-widest mb-3"
              style={{ color: '#6B6B8A' }}>// ACHIEVEMENTS</div>
            <div className="flex flex-wrap gap-2">
              {user.badges.map((badge) => {
                const b = BADGES[badge];
                if (!b) return null;
                return (
                  <div key={badge}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm"
                    style={{
                      background: `${b.color}11`,
                      border: `1px solid ${b.color}44`
                    }}>
                    <span style={{ fontSize: 14 }}>{b.icon}</span>
                    <span className="font-mono text-[10px] tracking-widest"
                      style={{ color: b.color }}>{b.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Edit form */}
        {editing ? (
          <div className="p-4 rounded-sm"
            style={{ background: '#12121A', border: '1px solid #252535' }}>
            <div className="font-mono text-[10px] tracking-widest mb-4"
              style={{ color: '#6B6B8A' }}>// EDIT PROFILE</div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block font-mono text-[10px] tracking-widest mb-1.5"
                  style={{ color: '#6B6B8A' }}>DISPLAY NAME</label>
                <input
                  className="hud-input w-full px-3 py-2.5 rounded-sm text-sm"
                  value={form.displayName}
                  onChange={e => setForm({...form, displayName: e.target.value})}
                  maxLength={40}
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] tracking-widest mb-1.5"
                  style={{ color: '#6B6B8A' }}>BIO</label>
                <textarea
                  className="hud-input w-full px-3 py-2.5 rounded-sm text-sm resize-none"
                  rows={3}
                  value={form.bio}
                  onChange={e => setForm({...form, bio: e.target.value})}
                  maxLength={160}
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] tracking-widest mb-1.5"
                  style={{ color: '#6B6B8A' }}>OPERATOR COLOR</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} type="button"
                      onClick={() => setForm({...form, avatarColor: c})}
                      style={{
                        width: 32, height: 32, borderRadius: 4,
                        background: c, cursor: 'pointer',
                        border: form.avatarColor === c
                          ? '2px solid white' : '2px solid transparent',
                        boxShadow: form.avatarColor === c
                          ? `0 0 12px ${c}` : 'none'
                      }}
                    />
                  ))}
                </div>
              </div>
              {error && (
                <div className="font-mono text-xs px-3 py-2 rounded-sm"
                  style={{
                    background: 'rgba(255,0,110,0.1)',
                    border: '1px solid rgba(255,0,110,0.3)',
                    color: '#FF006E'
                  }}>
                  ⚠ {error}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving}
                  className="hud-btn hud-btn-primary flex-1 py-2.5 rounded-sm text-xs"
                  style={{ opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
                <button
                  onClick={() => { setEditing(false); setError(''); }}
                  className="hud-btn hud-btn-ghost flex-1 py-2.5 rounded-sm text-xs">
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditing(true)}
            className="hud-btn hud-btn-ghost w-full py-3 rounded-sm text-xs">
            ✏ EDIT OPERATOR PROFILE
          </button>
        )}

        {/* Logout */}
        <button onClick={handleLogout}
          className="hud-btn w-full py-3 rounded-sm text-xs font-mono tracking-widest"
          style={{
            background: 'rgba(255,0,110,0.08)',
            border: '1px solid rgba(255,0,110,0.3)',
            color: '#FF006E'
          }}>
          ⏻ TERMINATE SESSION
        </button>

        <div className="text-center pb-4">
          <span className="font-mono text-[10px] tracking-widest"
            style={{ color: '#3A3A4A' }}>
            MAX CONNECTIVITY v2.0 // JARVIS PROTOCOL
          </span>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
