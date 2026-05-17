import { useState, useEffect, memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import useAuthStore from '../../context/authStore';
import MemeImage from '../ui/MemeImage';
import useToast from '../../hooks/useToast';
import hapticTap from '../../utils/haptic';

const formatCountdown = (expiresAt) => {
  const ms = new Date(expiresAt) - Date.now();
  if (ms <= 0) return 'ENDED';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m remaining`;
};

function BattleCard({ battle, onUpdate }) {
  const { user } = useAuthStore();
  const { toast } = useToast();
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
        toast.error(err.response?.data?.error || 'Vote failed');
      }
      setVoting(false);
    },
    [battle._id, onUpdate, toast]
  );

  const renderMeme = (meme) => {
    if (meme?.url?.startsWith?.('data:image')) {
      return <img src={meme.url} alt={meme.name} className="w-full h-full object-cover" />;
    }
    if (meme?.url) {
      return <MemeImage src={meme.url} alt={meme.name} fill className="w-full h-full" />;
    }
    return (
      <div className="w-full h-full flex items-center justify-center font-mono text-[10px]" style={{ color: '#6B6B8A' }}>
        AWAITING
      </div>
    );
  };

  const renderSide = (side) => {
    const fighter = side === 'challenger' ? battle.challenger : battle.opponent;
    const meme = side === 'challenger' ? battle.challengerMeme : battle.opponentMeme;
    const fighterId = (fighter._id || fighter).toString();
    const isWinner = isCompleted && winnerId === fighterId;
    const isLoser = isCompleted && winnerId && winnerId !== fighterId;
    const pct = side === 'challenger' ? challengerPct : opponentPct;
    const color = side === 'challenger' ? '#00F5FF' : '#FF006E';
    const votes = side === 'challenger' ? battle.votes.challenger : battle.votes.opponent;

    return (
      <motion.div
        layout
        className="flex flex-col min-w-0"
        style={{ opacity: isLoser ? 0.5 : 1 }}
      >
        {isWinner && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-center font-mono text-[10px] mb-1 px-2 py-0.5 rounded-sm mx-auto"
            style={{ background: '#FFB703', color: '#0A0A0F', boxShadow: '0 0 12px #FFB70366' }}
          >
            👑 WINNER
          </motion.div>
        )}
        <div
          className="relative rounded-sm overflow-hidden aspect-square mb-2"
          style={{
            border: `1px solid ${color}44`,
            boxShadow: isWinner ? `0 0 24px ${color}88` : 'none',
          }}
        >
          {renderMeme(meme)}
        </div>
        <p className="font-mono text-[9px] truncate text-center mb-2" style={{ color: '#6B6B8A' }}>
          {fighter.displayName || fighter.username}
        </p>
        {isActive && meme && (
          <>
            <div className="h-2 rounded-full overflow-hidden mb-1" style={{ background: '#0A0A0F' }}>
              <motion.div
                layoutId={`bar-${battle._id}-${side}`}
                className="h-full"
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{ background: color, boxShadow: `0 0 8px ${color}` }}
              />
            </div>
            <p className="font-mono text-[9px] text-center mb-2" style={{ color }}>
              {Math.round(pct)}%
            </p>
            {!isParticipant && (
              <button
                type="button"
                disabled={voting || hasVoted}
                onClick={() => handleVote(side)}
                className="w-full py-2 rounded-sm font-mono text-[10px] tracking-widest active:scale-95"
                style={{
                  background: hasVoted ? 'rgba(6,214,160,0.2)' : `${color}22`,
                  border: `1px solid ${hasVoted ? '#06D6A0' : color}`,
                  color: hasVoted ? '#06D6A0' : color,
                }}
              >
                {hasVoted ? 'VOTED ✓' : `VOTE ${side === 'challenger' ? 'A' : 'B'}`}
              </button>
            )}
          </>
        )}
      </motion.div>
    );
  };

  const challengerName = battle.challenger?.displayName || battle.challenger?.username;
  const opponentName = battle.opponent?.displayName || battle.opponent?.username;

  return (
    <div
      className={`p-4 rounded-sm corner-brackets mb-4 ${isActive ? 'battle-active-pulse' : ''}`}
      style={{ background: '#12121A', border: '1px solid #252535' }}
    >
      <div className="text-center mb-3">
        <span className="font-heading text-sm font-bold tracking-wider" style={{ color: '#E8E8FF' }}>
          {challengerName}
        </span>
        <span className="font-mono text-xs mx-2" style={{ color: '#FF006E' }}>VS</span>
        <span className="font-heading text-sm font-bold tracking-wider" style={{ color: '#E8E8FF' }}>
          {opponentName}
        </span>
      </div>

      {isParticipant && isActive && !battle.challengerMeme?.url && !battle.opponentMeme?.url && (
        <p className="font-mono text-[10px] text-center mb-3 animate-pulse" style={{ color: '#00F5FF' }}>
          AWAITING VOTES
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {renderSide('challenger')}
        {renderSide('opponent')}
      </div>

      {isActive && (
        <p className="font-mono text-[10px] text-center mt-3" style={{ color: '#FFB703' }}>
          ⏱ {countdown}
        </p>
      )}
    </div>
  );
}

export default memo(BattleCard);
