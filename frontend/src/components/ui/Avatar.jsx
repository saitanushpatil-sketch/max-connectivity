import { memo } from 'react';

const VIBE_EMOJIS = {
  available: null,
  gaming: '🎮',
  listening: '🎵',
  dnd: '😴',
  ghost: '👻',
  'on-fire': '🔥',
  chillin: '☕',
};

function Avatar({ user, size = 40, showStatus = false, showVibe = true, className = '' }) {
  if (!user) return null;

  const initials = (user.displayName || user.username || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const fontSize = size < 32 ? 10 : size < 48 ? 14 : size < 64 ? 18 : 22;
  const color = user.avatarColor || '#00F5FF';

  const statusClass = {
    online: 'status-online',
    away: 'status-away',
    offline: 'status-offline',
  }[user.status] || 'status-offline';

  const vibeEmoji = showVibe && user.vibe ? VIBE_EMOJIS[user.vibe] : null;

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      <div
        className="flex items-center justify-center rounded-sm font-heading font-bold select-none"
        style={{
          width: size,
          height: size,
          background: `linear-gradient(135deg, ${color}22 0%, ${color}44 100%)`,
          border: `1.5px solid ${color}66`,
          boxShadow: `0 0 12px ${color}33, inset 0 0 12px ${color}11`,
          fontSize,
          color,
          letterSpacing: '0.05em',
        }}
      >
        {initials}
      </div>
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-bg ${statusClass}`}
          style={{ width: Math.max(8, size * 0.22), height: Math.max(8, size * 0.22) }}
        />
      )}
      {vibeEmoji && (
        <span
          className="absolute flex items-center justify-center"
          style={{
            top: -3,
            right: -3,
            width: Math.max(14, size * 0.35),
            height: Math.max(14, size * 0.35),
            fontSize: Math.max(8, size * 0.22),
            lineHeight: 1,
            background: '#0A0A0F',
            borderRadius: '50%',
            border: '1px solid #252535',
          }}
          title={user.vibe}
        >
          {vibeEmoji}
        </span>
      )}
    </div>
  );
}

export default memo(Avatar);
