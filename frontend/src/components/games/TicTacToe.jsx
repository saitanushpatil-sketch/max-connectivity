import { useState, useEffect, useCallback, useRef } from 'react';
import useAuthStore from '../../context/authStore';
import useSocket, { getSocket } from '../../hooks/useSocket';
import hapticTap from '../../utils/haptic';
import api from '../../utils/api';

const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const BOARD_SIZE = 300;
const CELL_SIZE = BOARD_SIZE / 3;

function checkWinner(board) {
  for (const [a, b, c] of WINS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c])
      return { w: board[a], line: [a, b, c] };
  }
  if (board.every(Boolean)) return { w: 'draw', line: [] };
  return null;
}

function minimax(board, player) {
  const w = checkWinner(board)?.w;
  if (w === 'O') return { score: 1 };
  if (w === 'X') return { score: -1 };
  if (w === 'draw') return { score: 0 };
  const moves = [];
  board.forEach((cell, i) => {
    if (!cell) {
      const next = [...board]; next[i] = player;
      const res = minimax(next, player === 'X' ? 'O' : 'X');
      moves.push({ index: i, score: res.score });
    }
  });
  if (!moves.length) return { score: 0, index: -1 };
  if (player === 'O') return moves.reduce((b, m) => (m.score > b.score ? m : b));
  return moves.reduce((b, m) => (m.score < b.score ? m : b));
}

function cpuPick(board, human, ai, diff) {
  const empties = board.map((c, i) => c ? null : i).filter((i) => i !== null);
  if (!empties.length) return -1;
  if (diff === 'easy') {
    // Intentionally dumb: 30% chance to take win, 20% to block
    for (const i of empties) { const t = [...board]; t[i] = ai; if (Math.random() < 0.3 && checkWinner(t)?.w === ai) return i; }
    for (const i of empties) { const t = [...board]; t[i] = human; if (Math.random() < 0.2 && checkWinner(t)?.w === human) return i; }
    return empties[Math.floor(Math.random() * empties.length)];
  }
  if (diff === 'hard') return minimax(board, 'O').index;
  // Medium: always block wins, take wins, else random
  for (const i of empties) { const t = [...board]; t[i] = ai; if (checkWinner(t)?.w === ai) return i; }
  for (const i of empties) { const t = [...board]; t[i] = human; if (checkWinner(t)?.w === human) return i; }
  return empties[Math.floor(Math.random() * empties.length)];
}

// ─── Confetti ─────────────────────────────────────────────────────
function Confetti() {
  const COLORS = ['#00F5FF', '#FF006E', '#FFD700', '#06D6A0', '#8B5CF6'];
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    id: i, color: COLORS[i % COLORS.length],
    left: Math.random() * 100, delay: Math.random() * 0.5, size: 6 + Math.random() * 6,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 20 }}>
      {pieces.map((p) => (
        <div key={p.id} style={{ position: 'absolute', left: `${p.left}%`, top: '-10px', width: p.size, height: p.size, background: p.color, borderRadius: Math.random() > 0.5 ? '50%' : '2px', animation: `confetti ${1.2 + Math.random()}s ease-in ${p.delay}s forwards`, boxShadow: `0 0 4px ${p.color}` }} />
      ))}
    </div>
  );
}

// ─── Canvas Board ─────────────────────────────────────────────────
function TicCanvas({ board, line, drawProgress, shakeRef }) {
  const canvasRef = useRef(null);
  const animRef = useRef({});

  // Animate entries — track which cells have been drawn
  const drawnRef = useRef(new Set());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = BOARD_SIZE * dpr;
    canvas.height = BOARD_SIZE * dpr;
    canvas.style.width = BOARD_SIZE + 'px';
    canvas.style.height = BOARD_SIZE + 'px';
    ctx.scale(dpr, dpr);

    const draw = () => {
      ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);

      // Grid lines
      ctx.strokeStyle = '#252535';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00F5FF';
      ctx.shadowBlur = 6;
      [1, 2].forEach((i) => {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 8);
        ctx.lineTo(i * CELL_SIZE, BOARD_SIZE - 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(8, i * CELL_SIZE);
        ctx.lineTo(BOARD_SIZE - 8, i * CELL_SIZE);
        ctx.stroke();
      });
      ctx.shadowBlur = 0;

      // Cells
      board.forEach((val, i) => {
        if (!val) { drawnRef.current.delete(i); return; }
        const cx = (i % 3) * CELL_SIZE + CELL_SIZE / 2;
        const cy = Math.floor(i / 3) * CELL_SIZE + CELL_SIZE / 2;
        const cellSize = CELL_SIZE * 0.35;

        // Animate new cells
        if (!drawnRef.current.has(i)) {
          drawnRef.current.add(i);
          animRef.current[i] = { start: performance.now(), duration: 200 };
        }

        const anim = animRef.current[i];
        const progress = anim ? Math.min(1, (performance.now() - anim.start) / anim.duration) : 1;

        if (val === 'X') {
          ctx.strokeStyle = '#00F5FF';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.shadowColor = '#00F5FF';
          ctx.shadowBlur = 10;
          // Draw first line
          const p1 = progress < 0.5 ? progress * 2 : 1;
          ctx.beginPath();
          ctx.moveTo(cx - cellSize, cy - cellSize);
          ctx.lineTo(cx - cellSize + p1 * cellSize * 2, cy - cellSize + p1 * cellSize * 2);
          ctx.stroke();
          // Draw second line after first
          if (progress >= 0.5) {
            const p2 = (progress - 0.5) * 2;
            ctx.beginPath();
            ctx.moveTo(cx + cellSize, cy - cellSize);
            ctx.lineTo(cx + cellSize - p2 * cellSize * 2, cy - cellSize + p2 * cellSize * 2);
            ctx.stroke();
          }
        } else {
          ctx.strokeStyle = '#FF006E';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#FF006E';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(cx, cy, cellSize, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      });

      // Win line
      if (line && line.length === 3 && drawProgress > 0) {
        const [a, , c] = line;
        const ax = (a % 3) * CELL_SIZE + CELL_SIZE / 2;
        const ay = Math.floor(a / 3) * CELL_SIZE + CELL_SIZE / 2;
        const cx2 = (c % 3) * CELL_SIZE + CELL_SIZE / 2;
        const cy2 = Math.floor(c / 3) * CELL_SIZE + CELL_SIZE / 2;
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax + (cx2 - ax) * drawProgress, ay + (cy2 - ay) * drawProgress);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      animRef.current._raf = requestAnimationFrame(draw);
    };
    animRef.current._raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current._raf);
  }, [board, line, drawProgress]);

  return <canvas ref={canvasRef} style={{ display: 'block', touchAction: 'none' }} />;
}

// ─── CPU Thinking indicator ───────────────────────────────────────
function ThinkingDots() {
  return (
    <div className="flex gap-1 items-center justify-center py-2">
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#00F5FF', animation: `thinkDot 0.8s ease-in-out ${i * 0.15}s infinite` }} />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export default function TicTacToe({ onExit, onScoreSaved, socketMode = false, challengeId = null, opponentName = 'Friend', isHost = true }) {
  const { user } = useAuthStore();
  const { emitTttChallenge, emitTttMove, emitTttResult } = useSocket();
  const [mode, setMode] = useState(socketMode ? 'friend' : 'cpu');
  const [diff, setDiff] = useState('medium');
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState('X');
  const [result, setResult] = useState(null);
  const [line, setLine] = useState([]);
  const [stats, setStats] = useState({ w: 0, l: 0, d: 0 });
  const [thinking, setThinking] = useState(false);
  const [winProgress, setWinProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [shakeBoard, setShakeBoard] = useState(false);
  const [roomCode] = useState(() => Math.random().toString(36).slice(2, 8).toUpperCase());
  const [opponentJoined, setOpponentJoined] = useState(false);
  const [disconnected, setDisconnected] = useState(false);

  const playerMark = isHost ? 'X' : 'O';
  const oppMark = playerMark === 'X' ? 'O' : 'X';

  const gameId = (() => {
    if (!socketMode || !user?._id || !challengeId) return null;
    return [String(user._id), String(challengeId)].sort().join('_');
  })();

  // Animate win line
  useEffect(() => {
    if (!line.length) { setWinProgress(0); return; }
    let p = 0;
    const id = setInterval(() => {
      p += 0.06;
      if (p >= 1) { setWinProgress(1); clearInterval(id); }
      else setWinProgress(p);
    }, 16);
    return () => clearInterval(id);
  }, [line]);

  useEffect(() => {
    if (!socketMode || !gameId || !challengeId || !isHost) return;
    emitTttChallenge(challengeId, gameId);
  }, [socketMode, gameId, challengeId, isHost, emitTttChallenge]);

  useEffect(() => {
    if (!socketMode || !gameId) return;
    const s = getSocket();
    if (!s) return;
    const handleMove = (payload) => {
      if (payload.gameId !== gameId) return;
      setBoard(payload.board || Array(9).fill(null));
      setTurn(payload.nextPlayer || 'X');
      const r = checkWinner(payload.board);
      if (r) {
        setResult(r.w); setLine(r.line || []);
        resolveResult(r.w);
      }
    };
    const handleDisconnect = () => setDisconnected(true);
    s.on('ttt_move', handleMove);
    s.on('opponent_disconnected', handleDisconnect);
    return () => { s.off('ttt_move', handleMove); s.off('opponent_disconnected', handleDisconnect); };
  }, [socketMode, gameId, playerMark, oppMark]);

  const resolveResult = (w) => {
    if (w === playerMark) {
      setStats((s) => ({ ...s, w: s.w + 1 }));
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
      onScoreSaved?.();
      api.post('/games/ttt/win').catch(() => {});
      hapticTap([10, 5, 20]);
    } else if (w === oppMark) {
      setStats((s) => ({ ...s, l: s.l + 1 }));
      hapticTap([30, 20, 30]);
    } else {
      setStats((s) => ({ ...s, d: s.d + 1 }));
      setShakeBoard(true);
      setTimeout(() => setShakeBoard(false), 500);
    }
  };

  const reset = () => {
    setBoard(Array(9).fill(null)); setTurn('X'); setResult(null); setLine([]);
    setWinProgress(0); setShowConfetti(false); setThinking(false);
    hapticTap(6);
  };

  const apply = (idx2, mark) => {
    if (board[idx2] || result) return;
    if (socketMode && turn !== mark) return;
    if (!socketMode && mark !== playerMark) return;

    const next = [...board]; next[idx2] = mark;
    const r = checkWinner(next);
    setBoard(next);
    hapticTap(8);

    if (r) {
      setResult(r.w); setLine(r.line || []);
      resolveResult(r.w);
      if (socketMode && gameId && challengeId) emitTttResult(gameId, r.w, challengeId);
      return;
    }

    const nt = mark === 'X' ? 'O' : 'X';
    setTurn(nt);
    if (socketMode && gameId && challengeId) emitTttMove(gameId, next, nt, challengeId);

    // CPU turn
    if (!socketMode && mark === playerMark) {
      setThinking(true);
      setTimeout(() => {
        const ai = cpuPick(next, playerMark, oppMark, diff);
        if (ai < 0) { setThinking(false); return; }
        const after = [...next]; after[ai] = oppMark;
        const r2 = checkWinner(after);
        setBoard(after); setTurn('X'); setThinking(false);
        hapticTap(4);
        if (r2) { setResult(r2.w); setLine(r2.line || []); resolveResult(r2.w); }
      }, 350 + Math.random() * 300);
    }
  };

  const handleCellClick = (i) => apply(i, playerMark);

  const handleCanvasClick = (e) => {
    if (result || (socketMode && turn !== playerMark)) return;
    const canvas = e.currentTarget.querySelector('canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor(x / (rect.width / 3));
    const row = Math.floor(y / (rect.height / 3));
    const i = row * 3 + col;
    if (i >= 0 && i < 9) handleCellClick(i);
  };

  const isMyTurn = socketMode ? turn === playerMark : turn === playerMark;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <style>{`
        @keyframes confetti { 0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(350px) rotate(540deg);opacity:0} }
        @keyframes thinkDot { 0%,80%,100%{transform:scale(0);opacity:0.3}40%{transform:scale(1);opacity:1} }
        @keyframes boardShake { 0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)} }
      `}</style>

      {/* Score bar */}
      <div className="flex gap-3 w-full max-w-[320px]">
        {[
          { label: `YOU (${playerMark})`, val: stats.w, color: '#00F5FF' },
          { label: 'DRAW', val: stats.d, color: '#6B6B8A' },
          { label: mode === 'cpu' ? 'CPU' : opponentName, val: stats.l, color: '#FF006E' },
        ].map(({ label, val, color }) => (
          <div key={label} className="flex-1 text-center py-2 rounded-lg" style={{ background: '#12121A', border: '1px solid #252535' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#6B6B8A', letterSpacing: 1 }}>{label}</div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 24, color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Mode + Difficulty */}
      {!socketMode && (
        <div className="flex flex-col gap-2 w-full max-w-[320px]">
          <div className="flex gap-2">
            {['cpu', 'friend'].map((m) => (
              <button key={m} type="button" onClick={() => { setMode(m); reset(); }} style={{ flex: 1, fontFamily: 'monospace', fontSize: 11, letterSpacing: 1, color: mode === m ? '#00F5FF' : '#6B6B8A', background: '#12121A', border: `1px solid ${mode === m ? '#00F5FF' : '#252535'}`, borderRadius: 8, padding: '8px 0' }}>
                {m === 'cpu' ? 'VS CPU' : 'VS FRIEND'}
              </button>
            ))}
          </div>
          {mode === 'cpu' && (
            <div className="flex gap-2">
              {['easy', 'medium', 'hard'].map((d) => (
                <button key={d} type="button" onClick={() => { setDiff(d); reset(); }} style={{ flex: 1, fontFamily: 'monospace', fontSize: 10, letterSpacing: 1, color: diff === d ? '#FFB703' : '#6B6B8A', background: '#12121A', border: `1px solid ${diff === d ? '#FFB703' : '#252535'}`, borderRadius: 8, padding: '6px 0', transition: 'all 0.2s' }}>
                  {d.toUpperCase()}
                </button>
              ))}
            </div>
          )}
          {mode === 'friend' && (
            <div className="py-2 px-3 rounded-lg text-center" style={{ background: '#12121A', border: '1px solid #252535' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#6B6B8A', marginBottom: 4 }}>ROOM CODE</div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 900, fontSize: 28, color: '#00F5FF', letterSpacing: 8, textShadow: '0 0 16px rgba(0,245,255,0.4)' }}>{roomCode}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#6B6B8A', marginTop: 4 }}>Share this code with your friend</div>
            </div>
          )}
        </div>
      )}

      {/* Turn indicator */}
      <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: 2, color: isMyTurn ? '#00F5FF' : '#6B6B8A', textAlign: 'center' }}>
        {thinking ? '' : isMyTurn ? '// YOUR TURN' : socketMode ? '// WAITING...' : '// CPU THINKING'}
      </div>
      {(thinking && !socketMode) && <ThinkingDots />}
      {disconnected && <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#FF006E', textAlign: 'center' }}>⚠ Opponent disconnected</div>}

      {/* Board */}
      <div
        style={{ position: 'relative', cursor: result ? 'default' : 'pointer', animation: shakeBoard ? 'boardShake 0.5s ease' : 'none' }}
        onClick={handleCanvasClick}
      >
        {showConfetti && <Confetti />}
        <TicCanvas board={board} line={line} drawProgress={winProgress} />
      </div>

      {/* Result */}
      {result && (
        <div className="text-center flex flex-col gap-3">
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 28, fontWeight: 900, letterSpacing: 4, color: result === 'draw' ? '#FFB703' : result === playerMark ? '#06D6A0' : '#FF006E', textShadow: `0 0 20px ${result === 'draw' ? '#FFB703' : result === playerMark ? '#06D6A0' : '#FF006E'}66` }}>
            {result === 'draw' ? 'DRAW' : result === playerMark ? 'YOU WIN! 🎉' : 'YOU LOSE'}
          </div>
          <button type="button" onClick={reset} style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: 2, color: '#00F5FF', background: 'rgba(0,245,255,0.1)', border: '1px solid #00F5FF', borderRadius: 10, padding: '12px 32px' }}>
            REMATCH
          </button>
        </div>
      )}

      {onExit && <button type="button" onClick={onExit} style={{ fontFamily: 'monospace', fontSize: 10, color: '#6B6B8A', letterSpacing: 2 }}>EXIT</button>}
    </div>
  );
}
