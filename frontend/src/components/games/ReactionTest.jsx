import { useState, useRef, useEffect } from 'react';
import api from '../../utils/api';
import ShareScoreButton from './ShareScoreButton';

const ROUNDS = 5;

export default function ReactionTest() {
  const [phase, setPhase] = useState('idle');
  const [round, setRound] = useState(0);
  const [times, setTimes] = useState([]);
  const [flash, setFlash] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [result, setResult] = useState(null);
  const startRef = useRef(null);
  const timeoutRef = useRef(null);

  const loadBoard = async () => {
    try {
      const { data } = await api.get('/games/reaction/leaderboard');
      setLeaderboard(data.leaderboard || []);
    } catch {
      setLeaderboard([]);
    }
  };

  useEffect(() => { loadBoard(); }, []);

  const startRound = () => {
    setPhase('waiting');
    setFlash(false);
    const delay = 1500 + Math.random() * 3000;
    timeoutRef.current = setTimeout(() => {
      setFlash(true);
      setPhase('go');
      startRef.current = performance.now();
    }, delay);
  };

  const startGame = () => {
    setTimes([]);
    setRound(0);
    setResult(null);
    startRound();
  };

  const handleTap = async () => {
    if (phase === 'waiting') {
      clearTimeout(timeoutRef.current);
      setPhase('false');
      setTimeout(() => { setPhase('idle'); }, 1200);
      return;
    }
    if (phase !== 'go') return;

    const ms = Math.round(performance.now() - startRef.current);
    const nextTimes = [...times, ms];
    setTimes(nextTimes);
    setFlash(false);
    setPhase('result');

    if (round + 1 >= ROUNDS) {
      try {
        const { data } = await api.post('/games/reaction', { times: nextTimes });
        setResult(data);
        loadBoard();
      } catch (_) {}
      setPhase('done');
    } else {
      setRound((r) => r + 1);
      setTimeout(startRound, 1000);
    }
  };

  return (
    <div className="p-4 rounded-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
      <p className="font-mono text-[10px] mb-3" style={{ color: '#6B6B8A' }}>// REACTION PROTOCOL</p>

      <button
        type="button"
        onClick={phase === 'idle' || phase === 'done' ? startGame : handleTap}
        className="w-full h-48 rounded-sm flex flex-col items-center justify-center transition-all"
        style={{
          background: flash ? '#00F5FF' : '#0A0A0F',
          border: `2px solid ${flash ? '#00F5FF' : '#252535'}`,
          boxShadow: flash ? '0 0 40px rgba(0,245,255,0.6)' : 'none',
        }}
      >
        {phase === 'idle' && (
          <span className="font-heading text-xl" style={{ color: '#00F5FF' }}>INITIATE TEST</span>
        )}
        {phase === 'waiting' && (
          <span className="font-mono text-sm" style={{ color: '#6B6B8A' }}>WAIT FOR CYAN FLASH...</span>
        )}
        {phase === 'go' && (
          <span className="font-heading text-2xl font-bold" style={{ color: '#0A0A0F' }}>TAP NOW!</span>
        )}
        {phase === 'false' && (
          <span className="font-heading text-lg" style={{ color: '#FF006E' }}>TOO EARLY</span>
        )}
        {phase === 'result' && times.length > 0 && (
          <span className="font-mono text-lg" style={{ color: '#06D6A0' }}>
            {times[times.length - 1]}ms
          </span>
        )}
        {phase === 'done' && result && (
          <div className="text-center">
            <span className="font-mono text-xs block" style={{ color: '#6B6B8A' }}>JARVIS RESPONSE TIME</span>
            <span className="font-heading text-3xl font-bold" style={{ color: '#00F5FF' }}>{result.avgMs}ms</span>
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
          <ShareScoreButton message={`⚡ JARVIS RESPONSE TIME: ${result.avgMs}ms avg on MAX Connectivity`} />
          <button type="button" onClick={startGame} className="hud-btn hud-btn-ghost w-full py-2 rounded-sm text-xs mt-2">
            RETEST
          </button>
        </>
      )}

      {leaderboard.length > 0 && (
        <div className="mt-4 pt-3" style={{ borderTop: '1px solid #252535' }}>
          <p className="font-mono text-[10px] mb-2" style={{ color: '#6B6B8A' }}>// GLOBAL TOP 10</p>
          {leaderboard.map((e, i) => (
            <div key={e._id} className="flex justify-between py-1 font-mono text-[10px]">
              <span style={{ color: '#E8E8FF' }}>#{i + 1} {e.displayName}</span>
              <span style={{ color: '#00F5FF' }}>{e.avgMs}ms</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
