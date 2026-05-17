import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import ShareScoreButton from './ShareScoreButton';
import hapticTap from '../../utils/haptic';

const DURATION = 30;
const MOLE_MS = 800;
const CELLS = 9;

export default function WhackAMole({ onExit, onScoreSaved }) {
  const [active, setActive] = useState(-1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [high, setHigh] = useState(0);

  const scoreRef = useRef(0);
  const moleTimer = useRef(null);
  const gameTimer = useRef(null);

  const loadHigh = useCallback(async () => {
    try {
      const { data } = await api.get('/games/stats');
      setHigh(data.stats?.whackHighScore || 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadHigh();
  }, [loadHigh]);

  const popMole = useCallback(() => {
    if (moleTimer.current) clearTimeout(moleTimer.current);
    const idx = Math.floor(Math.random() * CELLS);
    setActive(idx);
    moleTimer.current = setTimeout(() => setActive(-1), MOLE_MS);
  }, []);

  const endGame = useCallback(async () => {
    setRunning(false);
    setDone(true);
    setActive(-1);
    if (moleTimer.current) clearTimeout(moleTimer.current);
    if (gameTimer.current) clearInterval(gameTimer.current);
    const final = scoreRef.current;
    try {
      const { data } = await api.post('/games/whack/score', { score: final });
      setHigh(data.highScore ?? final);
      onScoreSaved?.();
    } catch {
      setHigh((h) => Math.max(h, final));
    }
  }, [onScoreSaved]);

  const start = () => {
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(DURATION);
    setDone(false);
    setRunning(true);
    hapticTap(8);
    popMole();
    gameTimer.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => () => {
    if (moleTimer.current) clearTimeout(moleTimer.current);
    if (gameTimer.current) clearInterval(gameTimer.current);
  }, []);

  const whack = (i) => {
    if (!running || done || active !== i) return;
    scoreRef.current += 1;
    setScore(scoreRef.current);
    hapticTap(12);
    setActive(-1);
    if (moleTimer.current) clearTimeout(moleTimer.current);
    popMole();
  };

  return (
    <div className="p-4 rounded-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
      <div className="flex justify-between mb-3 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>
        <span>SCORE <span style={{ color: '#00F5FF' }}>{score}</span></span>
        <span>TIME <span style={{ color: timeLeft <= 5 ? '#FF006E' : '#FFB703' }}>{timeLeft}s</span></span>
        <span>BEST <span style={{ color: '#06D6A0' }}>{high}</span></span>
      </div>

      <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
        {Array.from({ length: CELLS }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => whack(i)}
            className="aspect-square rounded-sm font-heading text-2xl transition-all active:scale-95"
            style={{
              background: active === i ? '#FF006E' : '#0A0A0F',
              border: `2px solid ${active === i ? '#FF006E' : '#252535'}`,
              boxShadow: active === i ? '0 0 20px #FF006E' : 'none',
              color: active === i ? '#0A0A0F' : '#252535',
            }}
          >
            {active === i ? '🤖' : ''}
          </button>
        ))}
      </div>

      {!running && !done && (
        <button type="button" onClick={start} className="hud-btn w-full mt-4 py-3 text-xs" style={{ border: '1px solid #00F5FF', color: '#00F5FF' }}>
          START WHACK
        </button>
      )}
      {done && (
        <>
          <p className="text-center font-heading mt-4" style={{ color: '#06D6A0' }}>{score} BOTS WHACKED</p>
          <ShareScoreButton message={`🔨 MAX Whack-a-Bot: ${score} in 30s`} />
          <button type="button" onClick={start} className="hud-btn hud-btn-ghost w-full py-2 text-xs mt-2">AGAIN</button>
        </>
      )}
      {onExit && <button type="button" onClick={onExit} className="w-full mt-2 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>EXIT</button>}
    </div>
  );
}
