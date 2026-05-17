import { useState, useRef, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import CountUp from '../ui/CountUp';
import ShareScoreButton from './ShareScoreButton';
import hapticTap from '../../utils/haptic';

const ROUNDS = 5;
const MIN_DELAY = 1500;
const MAX_DELAY = 4000;
const CALIBRATE_MS = 900;

const panel = { background: '#12121A', border: '1px solid #252535' };

const MEDAL = ['🥇', '🥈', '🥉'];

export default function ReactionTest({ onExit, onScoreSaved }) {
  const [phase, setPhase] = useState('idle');
  const [round, setRound] = useState(0);
  const [times, setTimes] = useState([]);
  const [flash, setFlash] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [result, setResult] = useState(null);
  const [displayAvg, setDisplayAvg] = useState(0);

  const startRef = useRef(null);
  const timeoutRef = useRef(null);
  const canTapRef = useRef(false);

  const loadBoard = useCallback(async () => {
    try {
      const { data } = await api.get('/games/reaction/leaderboard');
      setLeaderboard(data.leaderboard || []);
    } catch {
      setLeaderboard([]);
    }
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const clearDelay = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startRound = useCallback(() => {
    clearDelay();
    setPhase('calibrating');
    setFlash(false);
    canTapRef.current = false;

    timeoutRef.current = setTimeout(() => {
      setPhase('waiting');
      const delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
      timeoutRef.current = setTimeout(() => {
        setFlash(true);
        setPhase('go');
        canTapRef.current = true;
        startRef.current = performance.now();
        hapticTap(15);
      }, delay);
    }, CALIBRATE_MS);
  }, [clearDelay]);

  const startGame = useCallback(() => {
    clearDelay();
    setTimes([]);
    setRound(0);
    setResult(null);
    setDisplayAvg(0);
    hapticTap(8);
    startRound();
  }, [clearDelay, startRound]);

  useEffect(() => () => clearDelay(), [clearDelay]);

  const handleTap = async () => {
    if (phase === 'waiting' || phase === 'calibrating') {
      clearDelay();
      canTapRef.current = false;
      setPhase('false');
      hapticTap([30, 50, 30]);
      setTimeout(() => setPhase('idle'), 1500);
      return;
    }
    if (phase !== 'go' || !canTapRef.current) return;

    canTapRef.current = false;
    const ms = Math.round(performance.now() - startRef.current);
    const nextTimes = [...times, ms];
    setTimes(nextTimes);
    setFlash(false);
    setPhase('result');
    hapticTap(10);

    if (round + 1 >= ROUNDS) {
      try {
        const { data } = await api.post('/games/reaction', { times: nextTimes });
        setResult(data);
        setDisplayAvg(data.avgMs);
        onScoreSaved?.();
        loadBoard();
      } catch {
        const avg = Math.round(nextTimes.reduce((a, b) => a + b, 0) / nextTimes.length);
        setResult({ avgMs: avg });
        setDisplayAvg(avg);
      }
      setPhase('done');
    } else {
      setRound((r) => r + 1);
      setTimeout(startRound, 1000);
    }
  };

  const handleButtonClick = () => {
    if (phase === 'idle' || phase === 'done') startGame();
    else handleTap();
  };

  return (
    <div className="p-4 rounded-sm" style={panel}>
      <p className="font-mono text-[10px] mb-3" style={{ color: '#6B6B8A' }}>
        // MAX REACTION PROTOCOL — 1500–4000ms RANDOM DELAY
      </p>

      <button
        type="button"
        onClick={handleButtonClick}
        className="w-full h-48 rounded-sm flex flex-col items-center justify-center transition-all active:scale-[0.98]"
        style={{
          background: flash ? '#00F5FF' : phase === 'false' ? 'rgba(255,0,110,0.12)' : '#0A0A0F',
          border: `2px solid ${flash ? '#00F5FF' : phase === 'false' ? '#FF006E' : '#252535'}`,
          boxShadow: flash ? '0 0 40px rgba(0,245,255,0.6)' : 'none',
        }}
      >
        {phase === 'idle' && (
          <span className="font-heading text-xl" style={{ color: '#00F5FF' }}>
            INITIATE TEST
          </span>
        )}
        {phase === 'calibrating' && (
          <span className="font-mono text-sm animate-pulse" style={{ color: '#FFB703' }}>
            MAX CALIBRATING...
          </span>
        )}
        {phase === 'waiting' && (
          <span className="font-mono text-sm" style={{ color: '#6B6B8A' }}>
            WAIT FOR CYAN FLASH...
          </span>
        )}
        {phase === 'go' && (
          <span className="font-heading text-2xl font-bold" style={{ color: '#0A0A0F' }}>
            TAP NOW!
          </span>
        )}
        {phase === 'false' && (
          <span className="font-heading text-xl font-bold" style={{ color: '#FF006E' }}>
            TOO EARLY!
          </span>
        )}
        {phase === 'result' && times.length > 0 && (
          <span className="font-mono text-lg" style={{ color: '#06D6A0' }}>
            {times[times.length - 1]}ms
          </span>
        )}
        {phase === 'done' && result && (
          <div className="text-center">
            <span className="font-mono text-xs block" style={{ color: '#6B6B8A' }}>
              MAX RESPONSE TIME
            </span>
            <span className="font-heading text-3xl font-bold" style={{ color: '#00F5FF' }}>
              <CountUp value={displayAvg || result.avgMs} suffix="ms" duration={1400} />
            </span>
          </div>
        )}
      </button>

      {phase !== 'idle' && phase !== 'done' && (
        <p className="font-mono text-center text-[10px] mt-2" style={{ color: '#6B6B8A' }}>
          ROUND {Math.min(round + 1, ROUNDS)}/{ROUNDS}
        </p>
      )}

      {phase === 'done' && result && (
        <>
          <ShareScoreButton message={`⚡ MAX RESPONSE TIME: ${result.avgMs}ms avg on MAX Connectivity`} />
          <button
            type="button"
            onClick={startGame}
            className="hud-btn hud-btn-ghost w-full py-2 rounded-sm text-xs mt-2 active:scale-95"
          >
            RETEST
          </button>
        </>
      )}

      {leaderboard.length > 0 && (
        <div className="mt-4 pt-3 rounded-sm" style={{ background: '#0A0A0F', border: '1px solid #252535' }}>
          <p className="font-mono text-[10px] mb-3 px-1" style={{ color: '#00F5FF' }}>
            // MAX GLOBAL LEADERBOARD
          </p>
          {leaderboard.map((e, i) => (
            <div
              key={e._id || `${e.username}-${i}`}
              className="flex items-center justify-between py-2 px-2 rounded-sm mb-1"
              style={{ background: i < 3 ? 'rgba(0,245,255,0.06)' : 'transparent' }}
            >
              <span className="truncate pr-2 font-mono text-[10px] flex items-center gap-1" style={{ color: '#E8E8FF' }}>
                <span style={{ color: i < 3 ? '#FFB703' : '#6B6B8A', minWidth: 20 }}>
                  {i < 3 ? MEDAL[i] : `#${i + 1}`}
                </span>
                {e.displayName || e.username}
              </span>
              <span className="flex-shrink-0 font-mono text-[10px] font-bold" style={{ color: '#00F5FF' }}>
                {e.avgMs}ms
              </span>
            </div>
          ))}
        </div>
      )}

      {onExit && (
        <button type="button" onClick={onExit} className="w-full mt-3 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>
          EXIT
        </button>
      )}
    </div>
  );
}
