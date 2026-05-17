import { useState, useEffect, memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import useAuthStore from '../../context/authStore';
import MemeImage from '../ui/MemeImage';
import hapticTap from '../../utils/haptic';

const formatCountdown = (expiresAt) => {
  const ms = new Date(expiresAt) - Date.now();
  if (ms <= 0) return '00:00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

function BattleCard({ battle, onUpdate }) {
  const { user } = useAuthStore();
  const [countdown, setCountdown] = useState(formatCountdown(battle.expiresAt));
  const [voting, setVoting] = useState(false);

  const uid = user._id;
  const challengerId = (battle.challenger._id || battle.challenger).toString();
  const opponentId = (battle.opponent._id || battle.opponent).toString();
  const totalVotes = battle.votes.challenger + battle.votes.opponent;
  const challengerPct = totalVotes ? (battle.votes.challenger / totalVotes) * 100 : 50;
  const opponentPct = totalVotes ? (battle.votes.opponent / totalVotes) * 100 : 50;
  const hasVoted = battle.voters?.some((v) => (v._id || v).toString() === uid);
  const isParticipant = uid === challengerId || uid === opponentId;
  const isActive = battle.status === 'active';
  const isCompleted = battle.status === 'completed';
  const winnerId = battle.winner ? (battle.winner._id || battle.winner).toString() : null;
  const userWon = isCompleted && winnerId === uid;
  const userLost = isCompleted && isParticipant && winnerId && winnerId !== uid;

  useEffect(() => {
    if (!isActive) return undefined;
    const t = setInterval(() => setCountdown(formatCountdown(battle.expiresAt)), 1000);
    return () => clearInterval(t);
  }, [battle.expiresAt, isActive]);

  const handleVote = useCallback(
    async (side) => {
      setVoting(true);
      hapticTap(10);
      try {
        const { data } = await api.put(`/battles/${battle._id}/vote`, { side });
        onUpdate?.(data.battle);
      } catch (err) {
        alert(err.response?.data?.error || 'Vote failed');
      }
      setVoting(false);
    },
    [battle._id, onUpdate]
  );

  const renderSide = (side) => {
    const fighter = side === 'challenger' ? battle.challenger : battle.opponent;
    const meme = side === 'challenger' ? battle.challengerMeme : battle.opponentMeme;
    const fighterId = (fighter._id || fighter).toString();
    const isWinner = isCompleted && winnerId === fighterId;
    const pct = side === 'challenger' ? challengerPct : opponentPct;
    const color = side === 'challenger' ? '#00F5FF' : '#FF006E';
    const votes = side === 'challenger' ? battle.votes.challenger : battle.votes.opponent;

    return (
      <motion.div key={side} className="relative min-w-0">
        {isWinner && (
          <motion.div
            initial={{ scale: 0, y: -8 }}
            animate={{ scale: 1, y: 0 }}
            className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 font-mono text-[10px] px-2 py-0.5 rounded-sm"
            style={{ background: '#FFB703', color: '#0A0A0F' }}
          >
            👑 WINNER
          </motion.div>
        )}
        <div
          className="relative rounded-sm overflow-hidden mb-2 aspect-square"
          style={{ border: `1px solid ${color}44`, boxShadow: isWinner ? `0 0 20px ${color}66` : 'none' }}
        >
          {meme?.url ? (
            <MemeImage src={meme.url} alt={meme.name} fill className="w-full h-full" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center font-mono text-xs"
              style={{ color: '#6B6B8A', background: '#0A0A0F' }}
            >
              AWAITING
            </div>
          )}
        </div>
        <p className="font-mono text-[9px] truncate mb-1" style={{ color: '#6B6B8A' }}>
          {fighter.displayName || fighter.username}
        </p>
        {isActive && meme && (
          <>
            <motion.div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: '#0A0A0F' }}>
              <motion.div
                className="h-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{ background: color, boxShadow: `0 0 8px ${color}` }}
              />
            </motion.div>
            <p className="font-mono text-[10px] text-center" style={{ color }}>
              {votes} VOTES ({Math.round(pct)}%)
            </p>
          </>
        )}
      </motion.div>
    );
  };

  return (
    <div
      className={`p-4 rounded-sm corner-brackets mb-4 ${isActive ? 'battle-active-pulse' : ''}`}
      style={{ background: '#12121A', border: '1px solid #252535' }}
    >
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <span className="font-mono text-[10px] tracking-widest" style={{ color: '#6B6B8A' }}>
          {battle.status.toUpperCase()}
        </span>
        {userWon && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="font-mono text-[10px] px-2 py-0.5 rounded-sm"
            style={{ background: 'rgba(6,214,160,0.2)', color: '#06D6A0', border: '1px solid #06D6A0' }}
          >
            VICTORY
          </motion.span>
        )}
        {userLost && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="font-mono text-[10px] px-2 py-0.5 rounded-sm"
            style={{ background: 'rgba(255,0,110,0.15)', color: '#FF006E', border: '1px solid #FF006E' }}
          >
            DEFEAT
          </motion.span>
        )}
        {isActive && (
          <span className="font-mono text-[10px] flex-shrink-0" style={{ color: '#FFB703' }}>
            ⏱ {countdown}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {renderSide('challenger')}
        {renderSide('opponent')}
      </div>

      {isActive && !isParticipant && !hasVoted && (
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            disabled={voting}
            onClick={() => handleVote('challenger')}
            className="flex-1 py-2 rounded-sm font-mono text-[10px] tracking-widest active:scale-95"
            style={{ background: 'rgba(0,245,255,0.15)', border: '1px solid #00F5FF', color: '#00F5FF' }}
          >
            VOTE CYAN
          </button>
          <button
            type="button"
            disabled={voting}
            onClick={() => handleVote('opponent')}
            className="flex-1 py-2 rounded-sm font-mono text-[10px] tracking-widest active:scale-95"
            style={{ background: 'rgba(255,0,110,0.15)', border: '1px solid #FF006E', color: '#FF006E' }}
          >
            VOTE PINK
          </button>
        </div>
      )}

      {hasVoted && isActive && (
        <p className="font-mono text-[10px] text-center mt-3" style={{ color: '#06D6A0' }}>
          ✓ VOTE RECORDED
        </p>
      )}
    </div>
  );
}

export default memo(BattleCard);
