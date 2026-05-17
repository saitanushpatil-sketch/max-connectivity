import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../utils/api';
import ShareScoreButton from './ShareScoreButton';
import hapticTap from '../../utils/haptic';

const SIZE = 4;

const TILE_STYLES = {
  0: { bg: 'transparent', color: '#6B6B8A' },
  2: { bg: '#1A1A26', color: '#E8E8FF' },
  4: { bg: '#252535', color: '#E8E8FF' },
  8: { bg: '#00F5FF22', color: '#00F5FF' },
  16: { bg: '#00F5FF33', color: '#00F5FF' },
  32: { bg: '#00F5FF44', color: '#00F5FF' },
  64: { bg: '#00F5FF55', color: '#0A0A0F' },
  128: { bg: '#FF006E33', color: '#FF006E' },
  256: { bg: '#FF006E44', color: '#FF006E' },
  512: { bg: '#FF006E55', color: '#E8E8FF' },
  1024: { bg: '#06D6A033', color: '#06D6A0' },
  2048: { bg: '#06D6A0', color: '#0A0A0F' },
};

const emptyGrid = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

function rotateGrid(g) {
  const n = g.length;
  return Array.from({ length: n }, (_, c) => g.map((row) => row[n - 1 - c]));
}

function slideRow(row) {
  const filtered = row.filter((v) => v);
  const merged = [];
  let scoreAdd = 0;
  for (let i = 0; i < filtered.length; i += 1) {
    if (filtered[i] && filtered[i] === filtered[i + 1]) {
      const v = filtered[i] * 2;
      merged.push(v);
      scoreAdd += v;
      i += 1;
    } else {
      merged.push(filtered[i]);
    }
  }
  while (merged.length < SIZE) merged.push(0);
  return { row: merged, scoreAdd };
}

function moveLeft(grid) {
  let add = 0;
  const next = grid.map((row) => {
    const { row: r, scoreAdd } = slideRow(row);
    add += scoreAdd;
    return r;
  });
  return { grid: next, scoreAdd: add };
}

function gridsEqual(a, b) {
  return a.every((row, y) => row.every((v, x) => v === b[y][x]));
}

function addRandomTile(grid) {
  const empty = [];
  grid.forEach((row, y) => {
    row.forEach((v, x) => {
      if (!v) empty.push({ y, x });
    });
  });
  if (!empty.length) return grid;
  const { y, x } = empty[Math.floor(Math.random() * empty.length)];
  const next = grid.map((r) => [...r]);
  next[y][x] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function initGrid() {
  return addRandomTile(addRandomTile(emptyGrid()));
}

function maxTile(grid) {
  return Math.max(...grid.flat());
}

const DIR = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

export default function Game2048({ onExit, onScoreSaved }) {
  const [grid, setGrid] = useState(initGrid);
  const [score, setScore] = useState(0);
  const [high, setHigh] = useState(0);
  const [over, setOver] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const touchRef = useRef(null);

  const loadHigh = useCallback(async () => {
    try {
      const { data } = await api.get('/games/stats');
      setHigh(data.stats?.game2048HighScore || 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadHigh();
  }, [loadHigh]);

  const saveIfBest = useCallback(async (s) => {
    if (s <= high) return;
    try {
      const { data } = await api.post('/games/2048/score', { score: s });
      setHigh(data.highScore ?? s);
      onScoreSaved?.();
    } catch {
      setHigh((h) => Math.max(h, s));
    }
  }, [high, onScoreSaved]);

  const move = useCallback((direction) => {
    if (over) return;
    let g = grid.map((r) => [...r]);
    let rotations = 0;
    if (direction === 'right') rotations = 2;
    if (direction === 'up') rotations = 3;
    if (direction === 'down') rotations = 1;
    for (let i = 0; i < rotations; i += 1) g = rotateGrid(g);

    const { grid: slid, scoreAdd } = moveLeft(g);
    let result = slid;
    for (let i = 0; i < (4 - rotations) % 4; i += 1) result = rotateGrid(result);

    if (gridsEqual(result, grid)) return;

    const next = addRandomTile(result);
    const newScore = score + scoreAdd;
    setGrid(next);
    setScore(newScore);
    setAnimKey((k) => k + 1);
    hapticTap(6);
    saveIfBest(newScore);

    const canMove = (() => {
      for (let y = 0; y < SIZE; y += 1) {
        for (let x = 0; x < SIZE; x += 1) {
          if (!next[y][x]) return true;
          if (x < SIZE - 1 && next[y][x] === next[y][x + 1]) return true;
          if (y < SIZE - 1 && next[y][x] === next[y + 1][x]) return true;
        }
      }
      return false;
    })();
    if (!canMove) setOver(true);
  }, [grid, score, over, saveIfBest]);

  useEffect(() => {
    const onKey = (e) => {
      if (!DIR[e.key]) return;
      e.preventDefault();
      move(DIR[e.key]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move]);

  const onTouchStart = (e) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e) => {
    if (!touchRef.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    touchRef.current = null;
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
    else move(dy > 0 ? 'down' : 'up');
  };

  const reset = () => {
    setGrid(initGrid());
    setScore(0);
    setOver(false);
    hapticTap(8);
  };

  return (
    <div className="p-4 rounded-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
      <div className="flex justify-between mb-3 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>
        <span>SCORE <span style={{ color: '#00F5FF' }}>{score}</span></span>
        <span>BEST <span style={{ color: '#06D6A0' }}>{high}</span></span>
        <span>TILE <span style={{ color: '#FF006E' }}>{maxTile(grid)}</span></span>
      </div>

      <div
        key={animKey}
        className="grid gap-2 mx-auto touch-none transition-opacity duration-150"
        style={{ gridTemplateColumns: `repeat(${SIZE}, 72px)`, background: '#0A0A0F', padding: 8, borderRadius: 4 }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {grid.map((row, y) =>
          row.map((val, x) => {
            const st = TILE_STYLES[val] || TILE_STYLES[2048];
            return (
              <div
                key={`${y}-${x}`}
                className="flex items-center justify-center font-heading font-bold rounded-sm transition-all duration-150"
                style={{
                  width: 72,
                  height: 72,
                  background: st.bg,
                  color: st.color,
                  fontSize: val > 512 ? 22 : 28,
                  border: val ? '1px solid #252535' : '1px solid #1A1A26',
                  transform: val ? 'scale(1)' : 'scale(0.96)',
                }}
              >
                {val || ''}
              </div>
            );
          })
        )}
      </div>

      {over && (
        <>
          <p className="text-center font-heading mt-4" style={{ color: '#FF006E' }}>GRID LOCKED</p>
          <ShareScoreButton message={`🔢 MAX 2048: ${score} pts (tile ${maxTile(grid)})`} />
        </>
      )}
      <button type="button" onClick={reset} className="hud-btn hud-btn-ghost w-full py-2 rounded-sm text-xs mt-3">NEW GAME</button>
      {onExit && <button type="button" onClick={onExit} className="w-full mt-2 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>EXIT</button>}
    </div>
  );
}
