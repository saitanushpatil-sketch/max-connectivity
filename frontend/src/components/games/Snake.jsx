import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import ShareScoreButton from './ShareScoreButton';
import hapticTap from '../../utils/haptic';

const GRID = 20;
const CELL = 16;
const BASE_MS = 140;

const DIR = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

function randFood(snake) {
  let p;
  do {
    p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (snake.some((s) => s.x === p.x && s.y === p.y));
  return p;
}

export default function Snake({ onExit, onScoreSaved }) {
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [high, setHigh] = useState(0);
  const [over, setOver] = useState(false);
  const [running, setRunning] = useState(false);
  const [eaten, setEaten] = useState(0);

  const nextDirRef = useRef({ x: 1, y: 0 });
  const snakeRef = useRef([{ x: 10, y: 10 }]);
  const foodRef = useRef({ x: 5, y: 5 });
  const scoreRef = useRef(0);
  const eatenRef = useRef(0);

  const loadHigh = useCallback(async () => {
    try {
      const { data } = await api.get('/games/stats');
      setHigh(data.stats?.snakeHighScore || 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadHigh();
  }, [loadHigh]);

  const reset = useCallback(() => {
    const start = [{ x: 10, y: 10 }];
    const f = randFood(start);
    const d = { x: 1, y: 0 };
    setSnake(start);
    setFood(f);
    setScore(0);
    setEaten(0);
    setOver(false);
    setRunning(true);
    nextDirRef.current = d;
    snakeRef.current = start;
    foodRef.current = f;
    scoreRef.current = 0;
    eatenRef.current = 0;
    hapticTap(8);
  }, []);

  const endGame = useCallback(async (finalScore) => {
    setOver(true);
    setRunning(false);
    hapticTap([20, 40, 20]);
    try {
      const { data } = await api.post('/games/snake/score', { score: finalScore });
      setHigh(data.highScore ?? finalScore);
      onScoreSaved?.();
    } catch {
      setHigh((h) => Math.max(h, finalScore));
    }
  }, [onScoreSaved]);

  const setDirection = useCallback((d, cur) => {
    if (d.x + cur.x === 0 && d.y + cur.y === 0) return;
    nextDirRef.current = d;
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (!DIR[e.key]) return;
      e.preventDefault();
      setDirection(DIR[e.key], nextDirRef.current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setDirection]);

  const touchStart = useRef(null);
  const handleTouchStart = (e) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    const cur = nextDirRef.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      setDirection(dx > 0 ? DIR.ArrowRight : DIR.ArrowLeft, cur);
    } else {
      setDirection(dy > 0 ? DIR.ArrowDown : DIR.ArrowUp, cur);
    }
  };

  useEffect(() => {
    if (!running || over) return undefined;

    const tick = () => {
      const head = snakeRef.current[0];
      const nh = { x: head.x + nextDirRef.current.x, y: head.y + nextDirRef.current.y };

      if (nh.x < 0 || nh.x >= GRID || nh.y < 0 || nh.y >= GRID) {
        endGame(scoreRef.current);
        return;
      }
      if (snakeRef.current.some((s) => s.x === nh.x && s.y === nh.y)) {
        endGame(scoreRef.current);
        return;
      }

      const next = [nh, ...snakeRef.current];
      if (nh.x === foodRef.current.x && nh.y === foodRef.current.y) {
        scoreRef.current += 10;
        eatenRef.current += 1;
        setScore(scoreRef.current);
        setEaten(eatenRef.current);
        foodRef.current = randFood(next);
        setFood(foodRef.current);
        hapticTap(10);
      } else {
        next.pop();
      }
      snakeRef.current = next;
      setSnake([...next]);
    };

    const speed = Math.max(60, BASE_MS - Math.floor(eatenRef.current / 5) * 15);
    const id = setInterval(tick, speed);
    return () => clearInterval(id);
  }, [running, over, eaten, endGame]);

  return (
    <div className="p-4 rounded-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
      <div className="flex justify-between mb-3 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>
        <span>SCORE: <span style={{ color: '#00F5FF' }}>{score}</span></span>
        <span>BEST: <span style={{ color: '#06D6A0' }}>{high}</span></span>
      </div>

      <div
        className="relative mx-auto rounded-sm touch-none"
        style={{ width: GRID * CELL, height: GRID * CELL, background: '#0A0A0F', border: '1px solid #252535' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {snake.map((s, i) => (
          <div
            key={`${s.x}-${s.y}-${i}`}
            style={{
              position: 'absolute',
              left: s.x * CELL,
              top: s.y * CELL,
              width: CELL - 1,
              height: CELL - 1,
              background: i === 0 ? '#00F5FF' : '#00F5FF88',
              boxShadow: i === 0 ? '0 0 8px #00F5FF' : 'none',
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            left: food.x * CELL,
            top: food.y * CELL,
            width: CELL - 1,
            height: CELL - 1,
            background: '#FF006E',
            boxShadow: '0 0 10px #FF006E',
          }}
        />
      </div>

      {!running && !over && (
        <button type="button" onClick={reset} className="hud-btn w-full mt-4 py-3 rounded-sm text-xs font-heading tracking-widest" style={{ border: '1px solid #00F5FF', color: '#00F5FF' }}>
          START SNAKE
        </button>
      )}
      {over && (
        <>
          <p className="font-heading text-center text-lg mt-4" style={{ color: '#FF006E' }}>GAME OVER</p>
          <ShareScoreButton message={`🐍 MAX Snake: ${score} pts`} />
          <button type="button" onClick={reset} className="hud-btn hud-btn-ghost w-full py-2 rounded-sm text-xs mt-2">RETRY</button>
        </>
      )}
      {onExit && (
        <button type="button" onClick={onExit} className="w-full mt-2 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>EXIT</button>
      )}
    </div>
  );
}