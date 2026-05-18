import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../context/authStore';
import useSocket, { getSocket } from '../../hooks/useSocket';
import ShareScoreButton from './ShareScoreButton';
import hapticTap from '../../utils/haptic';
import api from '../../utils/api';

const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function checkWinner(board) {
  for (const [a,b,c] of WINS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return { w: board[a], line: [a,b,c] };
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
      const next = [...board];
      next[i] = player;
      const res = minimax(next, player === 'X' ? 'O' : 'X');
      moves.push({ index: i, score: res.score });
    }
  });
  if (!moves.length) return { score: 0, index: -1 };
  if (player === 'O') return moves.reduce((best, m) => (m.score > best.score ? m : best));
  return moves.reduce((best, m) => (m.score < best.score ? m : best));
}

function cpuPick(board, human, ai, diff) {
  const empties = board.map((c,i)=>c?null:i).filter(i=>i!==null);
  if (!empties.length) return -1;
  if (diff === 'easy') return empties[Math.floor(Math.random()*empties.length)];
  if (diff === 'hard') {
    const { index } = minimax(board, 'O');
    return index;
  }
  for (const i of empties) {
    const t = [...board]; t[i] = ai;
    if (checkWinner(t)?.w === ai) return i;
  }
  for (const i of empties) {
    const t = [...board]; t[i] = human;
    if (checkWinner(t)?.w === human) return i;
  }
  return empties[Math.floor(Math.random()*empties.length)];
}

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

  const playerMark = isHost ? 'X' : 'O';
  const oppMark = playerMark === 'X' ? 'O' : 'X';
  const gameId = useMemo(() => {
    if (!socketMode || !user?._id || !challengeId) return null;
    return [String(user._id), String(challengeId)].sort().join('_');
  }, [socketMode, user, challengeId]);

  useEffect(() => {
    if (!socketMode || !gameId || !challengeId || !isHost) return;
    emitTttChallenge(challengeId, gameId);
  }, [socketMode, gameId, challengeId, isHost, emitTttChallenge]);

  useEffect(() => {
    if (!socketMode || !gameId) return undefined;
    const handler = (payload) => {
      if (payload.gameId !== gameId) return;
      setBoard(payload.board || Array(9).fill(null));
      setTurn(payload.nextPlayer || 'X');
      const r = checkWinner(payload.board);
      if (r) {
        setResult(r.w);
        setLine(r.line || []);
        if (r.w === playerMark) { setStats((s) => ({ ...s, w: s.w + 1 })); api.post('/games/ttt/win').catch(() => {}); }
        else if (r.w === oppMark) setStats((s) => ({ ...s, l: s.l + 1 }));
        else setStats((s) => ({ ...s, d: s.d + 1 }));
      }
    };
    const s = getSocket();
    if (!s) return undefined;
    s.on('ttt_move', handler);
    return () => s.off('ttt_move', handler);
  }, [socketMode, gameId, playerMark, oppMark]);

  const reset = () => {
    setBoard(Array(9).fill(null));
    setTurn('X');
    setResult(null);
    setLine([]);
    hapticTap(6);
  };

  const apply = (idx, mark) => {
    if (board[idx] || result) return;
    if (socketMode && turn !== mark) return;
    if (!socketMode && mark !== playerMark) return;
    const next = [...board];
    next[idx] = mark;
    const r = checkWinner(next);
    setBoard(next);
    hapticTap(8);
    if (r) {
      setResult(r.w);
      setLine(r.line || []);
      if (r.w === playerMark) {
        setStats((s) => ({ ...s, w: s.w + 1 }));
        onScoreSaved?.();
        api.post('/games/ttt/win').catch(() => {});
      }
      else if (r.w === oppMark) setStats(s=>({...s,l:s.l+1}));
      else setStats(s=>({...s,d:s.d+1}));
      if (socketMode && gameId && challengeId) emitTttResult(gameId, r.w, challengeId);
      return;
    }
    const nt = mark === 'X' ? 'O' : 'X';
    setTurn(nt);
    if (socketMode && gameId && challengeId) emitTttMove(gameId, next, nt, challengeId);

    if (!socketMode && mark === playerMark) {
      setTimeout(() => {
        const ai = cpuPick(next, playerMark, oppMark, diff);
        if (ai < 0) return;
        const after = [...next];
        after[ai] = oppMark;
        const r2 = checkWinner(after);
        setBoard(after);
        setTurn('X');
        if (r2) {
          setResult(r2.w);
          setLine(r2.line || []);
          if (r2.w === playerMark) {
            setStats((s) => ({ ...s, w: s.w + 1 }));
            onScoreSaved?.();
            api.post('/games/ttt/win').catch(() => {});
          }
          else if (r2.w === oppMark) setStats(s=>({...s,l:s.l+1}));
          else setStats(s=>({...s,d:s.d+1}));
        }
      }, 350);
    }
  };

  const cell = (i) => {
    const v = board[i];
    const glow = v === 'X' ? '0 0 14px #00F5FF' : v === 'O' ? '0 0 14px #FF006E' : 'none';
    return (
      <motion.button
        key={i}
        type="button"
        disabled={!!v || !!result || (socketMode && turn !== playerMark)}
        onClick={() => apply(i, playerMark)}
        className="relative aspect-square rounded-sm flex items-center justify-center font-heading text-3xl font-bold"
        style={{ background: '#0A0A0F', border: '2px solid #252535', color: v === 'X' ? '#00F5FF' : '#FF006E', boxShadow: glow }}
        whileTap={{ scale: 0.95 }}
      >
        {v === 'X' && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative">✕</motion.span>}
        {v === 'O' && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-full border-4" style={{ width: 28, height: 28, borderColor: '#FF006E' }} />}
      </motion.button>
    );
  };

  return (
    <div className="p-4 rounded-sm relative" style={{ background: '#12121A', border: '1px solid #252535' }}>
      <div className="flex justify-between items-center mb-3">
        <p className="font-mono text-[10px]" style={{ color: '#6B6B8A' }}>// TIC TAC TOE</p>
        <select value={mode} onChange={(e)=>{ setMode(e.target.value); reset(); }} className="font-mono text-[10px] rounded-sm px-2 py-1" style={{ background:'#0A0A0F', border:'1px solid #252535', color:'#00F5FF' }} disabled={socketMode}>
          <option value="cpu">VS CPU</option>
          <option value="friend">VS FRIEND</option>
        </select>
      </div>
      {mode === 'cpu' && !socketMode && (
        <div className="flex gap-2 mb-2">
          {['easy','medium','hard'].map(d=>(
            <button key={d} type="button" onClick={()=>setDiff(d)} className="font-mono text-[9px] px-2 py-1 rounded-sm" style={{ border: diff===d?'1px solid #00F5FF':'1px solid #252535', color: diff===d?'#00F5FF':'#6B6B8A' }}>{d.toUpperCase()}</button>
          ))}
        </div>
      )}
      <p className="font-mono text-[10px] mb-2" style={{ color: '#6B6B8A' }}>VS {socketMode ? opponentName : 'CPU'} · YOU ARE {playerMark}</p>
      <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto relative">
        {[0,1,2,3,4,5,6,7,8].map(cell)}
        <AnimatePresence>
          {line.length === 3 && (
            <motion.div key="win" className="absolute pointer-events-none" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} style={{ height: 4, background: '#06D6A0', originX: 0, top: '50%', left: 0, right: 0 }} />
          )}
        </AnimatePresence>
      </div>
      {result && (
        <div className="text-center mt-4">
          <p className="font-heading text-lg" style={{ color: result==='draw'?'#FFB703':result===playerMark?'#06D6A0':'#FF006E' }}>
            {result==='draw'?'DRAW':result===playerMark?'YOU WIN':'YOU LOSE'}
          </p>
          <button type="button" onClick={reset} className="hud-btn hud-btn-primary w-full py-2 mt-3 rounded-sm text-xs">REMATCH</button>
          {result===playerMark && <ShareScoreButton message="⭕ MAX Tic-Tac-Toe victory!" />}
        </div>
      )}
      <p className="text-center font-mono text-[10px] mt-2" style={{ color: '#6B6B8A' }}>W {stats.w} · L {stats.l} · D {stats.d}</p>
      {onExit && <button type="button" onClick={onExit} className="w-full mt-2 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>EXIT</button>}
    </div>
  );
}
