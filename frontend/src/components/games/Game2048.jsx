import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../utils/api';
import hapticTap from '../../utils/haptic';

const SIZE = 4;
const CELL_SIZE = 72;
const GAP = 8;

// ─── Tile visual config ───────────────────────────────────────────
const TILE_CFG = {
  0:    { bg: 'transparent',        color: 'transparent', border: 'transparent',    glow: '' },
  2:    { bg: '#1E1E2E',            color: '#E8E8FF',     border: '#252535',         glow: '' },
  4:    { bg: '#252535',            color: '#E8E8FF',     border: '#2E2E45',         glow: '' },
  8:    { bg: 'rgba(0,245,255,0.08)', color: '#00F5FF', border: 'rgba(0,245,255,0.27)', glow: '0 0 12px rgba(0,245,255,0.3)' },
  16:   { bg: 'rgba(0,245,255,0.15)', color: '#00F5FF', border: 'rgba(0,245,255,0.4)',  glow: '0 0 16px rgba(0,245,255,0.45)' },
  32:   { bg: 'rgba(255,0,110,0.08)', color: '#FF006E', border: 'rgba(255,0,110,0.27)', glow: '0 0 12px rgba(255,0,110,0.3)' },
  64:   { bg: 'rgba(255,0,110,0.15)', color: '#FF006E', border: 'rgba(255,0,110,0.4)',  glow: '0 0 16px rgba(255,0,110,0.45)' },
  128:  { bg: 'rgba(6,214,160,0.08)', color: '#06D6A0', border: 'rgba(6,214,160,0.27)', glow: '0 0 12px rgba(6,214,160,0.3)' },
  256:  { bg: 'rgba(6,214,160,0.15)', color: '#06D6A0', border: 'rgba(6,214,160,0.4)',  glow: '0 0 18px rgba(6,214,160,0.5)' },
  512:  { bg: 'rgba(255,183,3,0.08)',  color: '#FFB703', border: 'rgba(255,183,3,0.27)', glow: '0 0 12px rgba(255,183,3,0.3)' },
  1024: { bg: 'rgba(255,183,3,0.15)',  color: '#FFB703', border: 'rgba(255,183,3,0.4)',  glow: '0 0 18px rgba(255,183,3,0.5)' },
  2048: { bg: 'rgba(255,183,3,0.25)',  color: '#FFD700', border: 'rgba(255,183,3,0.8)',  glow: '0 0 28px rgba(255,215,0,0.8)' },
};
const MAX_TILE = 2048;
function getTileCfg(v) { return TILE_CFG[v] || TILE_CFG[MAX_TILE]; }

// ─── Game logic ───────────────────────────────────────────────────
const emptyGrid = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

function rotateGrid(g) {
  const n = g.length;
  return Array.from({ length: n }, (_, c) => g.map((row) => row[n - 1 - c]));
}

function slideRow(row) {
  const filtered = row.filter((v) => v);
  const merged = [];
  let scoreAdd = 0;
  const mergedFlags = [];
  for (let i = 0; i < filtered.length; i++) {
    if (filtered[i] && filtered[i] === filtered[i + 1]) {
      const v = filtered[i] * 2;
      merged.push(v);
      mergedFlags.push(true);
      scoreAdd += v;
      i++;
    } else {
      merged.push(filtered[i]);
      mergedFlags.push(false);
    }
  }
  while (merged.length < SIZE) { merged.push(0); mergedFlags.push(false); }
  return { row: merged, scoreAdd, mergedFlags };
}

function moveLeft(grid) {
  let add = 0;
  const mergeMap = [];
  const next = grid.map((row) => {
    const { row: r, scoreAdd, mergedFlags } = slideRow(row);
    add += scoreAdd;
    mergeMap.push(mergedFlags);
    return r;
  });
  return { grid: next, scoreAdd: add, mergeMap };
}

function gridsEqual(a, b) {
  return a.every((row, y) => row.every((v, x) => v === b[y][x]));
}

function addRandomTile(grid) {
  const empty = [];
  grid.forEach((row, y) => { row.forEach((v, x) => { if (!v) empty.push({ y, x }); }); });
  if (!empty.length) return grid;
  const { y, x } = empty[Math.floor(Math.random() * empty.length)];
  const next = grid.map((r) => [...r]);
  next[y][x] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function initGrid() { return addRandomTile(addRandomTile(emptyGrid())); }
function maxTile(grid) { return Math.max(...grid.flat()); }

function canMove(grid) {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (!grid[y][x]) return true;
      if (x < SIZE - 1 && grid[y][x] === grid[y][x + 1]) return true;
      if (y < SIZE - 1 && grid[y][x] === grid[y + 1][x]) return true;
    }
  }
  return false;
}

const DIR_ROTATIONS = { left: 0, right: 2, up: 3, down: 1 };
const ARROW_DIR = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

// ─── Score Popup ──────────────────────────────────────────────────
function ScorePopup({ value, id }) {
  return (
    <div
      key={id}
      style={{
        position: 'absolute',
        top: '40%',
        left: '50%',
        transform: 'translate(-50%,-50%)',
        fontFamily: 'Rajdhani, sans-serif',
        fontWeight: 700,
        fontSize: 20,
        color: '#FFB703',
        textShadow: '0 0 12px rgba(255,183,3,0.7)',
        pointerEvents: 'none',
        animation: 'scoreFloat 1s ease-out forwards',
        zIndex: 20,
      }}
    >
      +{value}
    </div>
  );
}

// ─── Confetti ─────────────────────────────────────────────────────
function Confetti() {
  const COLORS = ['#00F5FF', '#FF006E', '#FFD700', '#06D6A0', '#8B5CF6'];
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    color: COLORS[i % COLORS.length],
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    size: 6 + Math.random() * 8,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 30 }}>
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: '-20px',
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animation: `confettiFall ${1.5 + Math.random()}s ease-in ${p.delay}s forwards`,
            boxShadow: `0 0 6px ${p.color}`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Tile Component ───────────────────────────────────────────────
function Tile({ value, row, col, isNew, isMerged }) {
  const cfg = getTileCfg(value);
  const x = col * (CELL_SIZE + GAP);
  const y = row * (CELL_SIZE + GAP);
  const fontSize = value >= 1000 ? 18 : value >= 100 ? 22 : 28;
  const isRainbow = value >= 2048;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: CELL_SIZE,
        height: CELL_SIZE,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        boxShadow: cfg.glow || 'none',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Rajdhani, sans-serif',
        fontWeight: 700,
        fontSize,
        color: cfg.color,
        transition: 'left 0.1s cubic-bezier(0.175,0.885,0.32,1.275), top 0.1s cubic-bezier(0.175,0.885,0.32,1.275)',
        animation: isNew ? 'tileSpawn 0.18s cubic-bezier(0.175,0.885,0.32,1.275)' : isMerged ? 'tileMerge 0.15s ease-out' : 'none',
        outline: isRainbow ? '2px solid transparent' : 'none',
        backgroundImage: isRainbow ? `linear-gradient(135deg, rgba(255,183,3,0.25), rgba(0,245,255,0.2)), linear-gradient(#0A0A0F,#0A0A0F)` : 'none',
      }}
    >
      {value > 0 ? value : ''}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export default function Game2048({ onExit, onScoreSaved }) {
  const [grid, setGrid] = useState(initGrid);
  const [score, setScore] = useState(0);
  const [high, setHigh] = useState(0);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const [newTiles, setNewTiles] = useState(new Set());
  const [mergedTiles, setMergedTiles] = useState(new Set());
  const [popups, setPopups] = useState([]);
  const [popupId, setPopupId] = useState(0);
  const [showWinOverlay, setShowWinOverlay] = useState(false);

  const touchRef = useRef(null);
  const undoRef = useRef(null);
  const highRef = useRef(0);

  // Load best score
  const loadHigh = useCallback(async () => {
    try {
      const { data } = await api.get('/games/stats');
      const h = data.stats?.game2048HighScore || 0;
      setHigh(h); highRef.current = h;
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadHigh(); }, [loadHigh]);

  // Restore from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('max2048');
      if (saved) {
        const { grid: g, score: s } = JSON.parse(saved);
        if (g) { setGrid(g); setScore(s || 0); }
      }
    } catch { /* ignore */ }
  }, []);

  // Save to localStorage on grid change
  useEffect(() => {
    try { localStorage.setItem('max2048', JSON.stringify({ grid, score })); } catch { /* ignore */ }
  }, [grid, score]);

  const saveIfBest = useCallback(async (s) => {
    if (s <= highRef.current) return;
    try {
      const { data } = await api.post('/games/2048/score', { score: s });
      const h = data.highScore ?? s;
      setHigh(h); highRef.current = h;
      onScoreSaved?.();
    } catch {
      setHigh((h) => Math.max(h, s));
      highRef.current = Math.max(highRef.current, s);
    }
  }, [onScoreSaved]);

  const move = useCallback((direction) => {
    if (over) return;
    // Save undo state
    undoRef.current = { grid: grid.map((r) => [...r]), score };

    let g = grid.map((r) => [...r]);
    let rotations = DIR_ROTATIONS[direction] || 0;
    for (let i = 0; i < rotations; i++) g = rotateGrid(g);
    const { grid: slid, scoreAdd } = moveLeft(g);
    let result = slid;
    for (let i = 0; i < (4 - rotations) % 4; i++) result = rotateGrid(result);

    if (gridsEqual(result, grid)) return;

    // Find new tile position
    const next = addRandomTile(result);
    const newSet = new Set();
    const mergedSet = new Set();

    // Detect new tile
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (next[y][x] !== 0 && result[y][x] === 0) {
          newSet.add(`${y}-${x}`);
        }
        // Detect merges (value increased from previous grid)
        if (next[y][x] > grid[y][x] && grid[y][x] !== 0) {
          mergedSet.add(`${y}-${x}`);
        }
      }
    }

    const newScore = score + scoreAdd;
    setGrid(next);
    setScore(newScore);
    setNewTiles(newSet);
    setMergedTiles(mergedSet);
    hapticTap(6);
    saveIfBest(newScore);

    // Score popup
    if (scoreAdd > 0) {
      const pid = popupId + 1;
      setPopupId(pid);
      setPopups((prev) => [...prev, { value: scoreAdd, id: pid }]);
      setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== pid)), 1000);
    }

    // Check win
    const mt = maxTile(next);
    if (mt >= 2048 && !won) {
      setWon(true);
      setShowWinOverlay(true);
      hapticTap([15, 10, 20]);
    }

    // Check game over
    if (!canMove(next)) setOver(true);

    // Clear anim flags
    setTimeout(() => { setNewTiles(new Set()); setMergedTiles(new Set()); }, 300);
  }, [grid, score, over, won, saveIfBest, popupId]);

  const undo = useCallback(() => {
    if (!undoRef.current) return;
    const { grid: g, score: s } = undoRef.current;
    setGrid(g); setScore(s); setOver(false); undoRef.current = null;
    hapticTap(6);
  }, []);

  const reset = useCallback(() => {
    const g = initGrid();
    setGrid(g); setScore(0); setOver(false); setWon(false);
    setShowWinOverlay(false); undoRef.current = null;
    try { localStorage.removeItem('max2048'); } catch { /* */ }
    hapticTap(8);
  }, []);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (!ARROW_DIR[e.key]) return;
      e.preventDefault();
      move(ARROW_DIR[e.key]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move]);

  // Touch swipe
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

  const boardSize = SIZE * CELL_SIZE + (SIZE - 1) * GAP;

  return (
    <div className="flex flex-col items-center p-4 gap-4" style={{ minHeight: '100%' }}>
      <style>{`
        @keyframes tileSpawn {
          0% { transform: scale(0); }
          60% { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
        @keyframes tileMerge {
          0% { transform: scale(1); }
          40% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
        @keyframes scoreFloat {
          0% { opacity: 1; transform: translate(-50%,-50%); }
          100% { opacity: 0; transform: translate(-50%, -150%); }
        }
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(600px) rotate(720deg); opacity: 0; }
        }
        @keyframes rainbowBorder {
          0% { border-color: #FF006E; }
          33% { border-color: #00F5FF; }
          66% { border-color: #FFD700; }
          100% { border-color: #FF006E; }
        }
      `}</style>

      {/* Score bar */}
      <div className="flex gap-4 w-full max-w-[320px]">
        {[
          { label: 'SCORE', value: score, color: '#00F5FF' },
          { label: 'BEST', value: high, color: '#06D6A0' },
          { label: 'TILE', value: maxTile(grid), color: '#FFB703' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex-1 text-center p-2 rounded-lg" style={{ background: '#12121A', border: '1px solid #252535' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#6B6B8A', letterSpacing: 2 }}>{label}</div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 20, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 w-full max-w-[320px]">
        <button
          type="button"
          onClick={reset}
          style={{ flex: 1, fontFamily: 'monospace', fontSize: 11, letterSpacing: 2, color: '#E8E8FF', background: '#12121A', border: '1px solid #252535', borderRadius: 8, padding: '8px 0' }}
        >
          NEW GAME
        </button>
        <button
          type="button"
          onClick={undo}
          disabled={!undoRef.current}
          style={{ flex: 1, fontFamily: 'monospace', fontSize: 11, letterSpacing: 2, color: undoRef.current ? '#FFB703' : '#3A3A4A', background: '#12121A', border: `1px solid ${undoRef.current ? '#FFB70366' : '#252535'}`, borderRadius: 8, padding: '8px 0' }}
        >
          ↩ UNDO
        </button>
      </div>

      {/* Board */}
      <div
        style={{
          position: 'relative',
          width: boardSize,
          height: boardSize,
          background: '#0A0A0F',
          borderRadius: 10,
          padding: 0,
          border: '1px solid #252535',
          touchAction: 'none',
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Grid cells background */}
        {Array.from({ length: SIZE }, (_, y) =>
          Array.from({ length: SIZE }, (_, x) => (
            <div
              key={`cell-${y}-${x}`}
              style={{
                position: 'absolute',
                left: x * (CELL_SIZE + GAP),
                top: y * (CELL_SIZE + GAP),
                width: CELL_SIZE,
                height: CELL_SIZE,
                background: '#12121A',
                borderRadius: 6,
                border: '1px solid #1E1E2E',
              }}
            />
          ))
        )}

        {/* Tiles */}
        {grid.map((row, y) =>
          row.map((value, x) =>
            value > 0 ? (
              <Tile
                key={`tile-${y}-${x}`}
                value={value}
                row={y}
                col={x}
                isNew={newTiles.has(`${y}-${x}`)}
                isMerged={mergedTiles.has(`${y}-${x}`)}
              />
            ) : null
          )
        )}

        {/* Score popups */}
        {popups.map((p) => <ScorePopup key={p.id} value={p.value} id={p.id} />)}

        {/* 2048 confetti */}
        {showWinOverlay && <Confetti />}

        {/* Game Over overlay */}
        {over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg" style={{ background: 'rgba(10,10,15,0.88)', zIndex: 25, backdropFilter: 'blur(4px)' }}>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 32, fontWeight: 900, color: '#FF006E', textShadow: '0 0 20px rgba(255,0,110,0.6)', letterSpacing: 4 }}>GAME OVER</div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#6B6B8A', marginTop: 8 }}>SCORE: <span style={{ color: '#00F5FF' }}>{score}</span></div>
            <button type="button" onClick={reset} style={{ marginTop: 20, fontFamily: 'monospace', fontSize: 12, letterSpacing: 2, color: '#00F5FF', background: 'rgba(0,245,255,0.1)', border: '1px solid #00F5FF', borderRadius: 8, padding: '10px 28px' }}>NEW GAME</button>
            {undoRef.current && <button type="button" onClick={undo} style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 11, color: '#FFB703' }}>↩ UNDO LAST MOVE</button>}
          </div>
        )}

        {/* Win overlay */}
        {showWinOverlay && !over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg" style={{ background: 'rgba(10,10,15,0.85)', zIndex: 25, backdropFilter: 'blur(4px)' }}>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 26, fontWeight: 900, color: '#FFD700', textShadow: '0 0 30px rgba(255,215,0,0.8)', letterSpacing: 3, textAlign: 'center', lineHeight: 1.3 }}>✨ MAX ACHIEVED!<br />2048!</div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#6B6B8A', marginTop: 8 }}>SCORE: <span style={{ color: '#FFD700' }}>{score}</span></div>
            <button type="button" onClick={() => setShowWinOverlay(false)} style={{ marginTop: 20, fontFamily: 'monospace', fontSize: 12, letterSpacing: 2, color: '#FFD700', background: 'rgba(255,215,0,0.1)', border: '1px solid #FFD700', borderRadius: 8, padding: '10px 28px' }}>KEEP GOING →</button>
          </div>
        )}
      </div>

      {onExit && (
        <button type="button" onClick={onExit} style={{ fontFamily: 'monospace', fontSize: 10, color: '#6B6B8A', letterSpacing: 2 }}>EXIT</button>
      )}
    </div>
  );
}
