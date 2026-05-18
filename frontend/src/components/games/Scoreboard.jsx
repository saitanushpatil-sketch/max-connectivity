import { useState, useEffect } from 'react';
import useAuthStore from '../../context/authStore';
import api from '../../utils/api';

const GAME_LABELS = {
  '2048': '2048',
  reaction: 'SPEED TAP',
  desi: 'DESI QUIZ',
  ttt: 'TIC TAC TOE',
  car: 'CAR RACER',
  space: 'SPACE SHOOTER',
};

export default function Scoreboard({ game, onClose }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    api.get(`/games/leaderboard?game=${game}`)
      .then((r) => setData(r.data.leaderboard || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [game]);

  const RANK_EMOJIS = ['🥇', '🥈', '🥉'];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(10,10,15,0.95)',
      zIndex: 999, display: 'flex', flexDirection: 'column',
      padding: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: '#6B6B8A',
            fontSize: 20, cursor: 'pointer', marginRight: 12,
          }}
        >
          ←
        </button>
        <h2 style={{
          fontFamily: 'Rajdhani, sans-serif', fontSize: 24,
          color: '#00F5FF', margin: 0, fontWeight: 700,
          letterSpacing: '0.1em',
        }}>
          🏆 {GAME_LABELS[game] || 'LEADERBOARD'}
        </h2>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#00F5FF', fontFamily: 'Share Tech Mono, monospace' }}>
          LOADING...
        </div>
      ) : data.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 40,
          color: '#6B6B8A', fontFamily: 'Share Tech Mono, monospace', fontSize: 12,
        }}>
          NO SCORES YET — BE THE FIRST!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
          {data.map((entry, idx) => (
            <div
              key={`${entry.username}-${idx}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 8,
                background: entry.username === user?.username
                  ? 'rgba(0,245,255,0.1)' : '#12121A',
                border: `1px solid ${entry.username === user?.username ? '#00F5FF44' : '#252535'}`,
              }}
            >
              <span style={{ fontSize: 24, width: 32, textAlign: 'center' }}>
                {idx < 3 ? RANK_EMOJIS[idx] : `#${idx + 1}`}
              </span>
              <div style={{
                width: 40, height: 40, borderRadius: 6,
                background: `${entry.avatarColor || '#00F5FF'}22`,
                border: `1.5px solid ${entry.avatarColor || '#00F5FF'}`,
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
                color: entry.avatarColor || '#00F5FF',
                fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 16,
              }}>
                {(entry.displayName || entry.username)[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 600, color: '#E8E8FF', margin: 0, fontSize: 16 }}>
                  {entry.displayName || entry.username}
                </p>
                <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#6B6B8A', margin: 0 }}>
                  @{entry.username}
                </p>
              </div>
              <span style={{
                fontFamily: 'Rajdhani, sans-serif', fontSize: 22,
                fontWeight: 700,
                color: idx === 0 ? '#FFD700' : '#00F5FF',
              }}>
                {game === 'reaction' ? `${entry.score}ms` : entry.score.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
