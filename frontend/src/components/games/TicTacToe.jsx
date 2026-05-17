import { useState, useEffect, useCallback } from 'react';
import { getSocket } from '../../hooks/useSocket';
import ShareScoreButton from './ShareScoreButton';
import hapticTap from '../../utils/haptic';
import useToast from '../../hooks/useToast';

const WINS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board) {
  for (const [a, b, c] of WINS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every(Boolean)) return 'draw';
  return null;
}

function minimax(board, player) {
  const w = checkWinner(board);
  if (w === 'O') return { score: 1 };
  if (w === 'X') return { score: -1 };
  if (w === 'draw') return { score: 0 };

  const moves = [];
  board.forEach((cell, i) => {
    if (!cell) {
      const next = [...board];
      next[i] = player;
      const result = minimax(next, player === 'X' ? 'O' : 'X');
      moves.push({ index: i, score: result.score });
    }
  });

  if (player === 'O') {
    return moves.reduce((best, m) => (m.score > best.score ? m : best));
  }
  return moves.reduce((best, m) => (m.score < best.score ? m : best));
}

function cpuMove(board) {
  const { index } = minimax(board, 'O');
  return index;
}

export default function TicTacToe({
  onExit,
  onScoreSaved,
  socketMode = false,
  challengeId = null,
  opponentName = 'CPU',
  isHost = true,
}) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState('X');
  const [winner, setWinner] = useState(null);
  const [wins, setWins] = useState(0);
  const { toast } = useToast();

  const playerMark = isHost ? 'X' : 'O';
  const cpuMark = playerMark === 'X' ? 'O' : 'X';

  useEffect(() => {
    if (!socketMode || !challengeId) return undefined;
    const socket = getSocket();
    if (!socket) return undefined;

    const onMove = ({ board: remoteBoard, turn: remoteTurn }) => {
      setBoard(remoteBoard);
      setTurn(remoteTurn);
      const w = checkWinner(remoteBoard);
      if (w) setWinner(w);
    };

    socket.on('ttt_move', onMove);
    return () => socket.off('ttt_move', onMove);
  }, [socketMode, challengeId]);

  const emitMove = useCallback((nextBoard, nextTurn) => {
    const socket = getSocket();
    if (socketMode && challengeId && socket) {
      socket.emit('ttt_move', { challengeId, board: nextBoard, turn: nextTurn });
    }
  }, [socketMode, challengeId]);

  const applyMove = useCallback((idx, mark) => {
    if (board[idx] || winner) return;
    const next = [...board];
    next[idx] = mark;
    const w = checkWinner(next);
    const nextTurn = mark === 'X' ? 'O' : 'X';
    setBoard(next);
    setTurn(nextTurn);
    hapticTap(8);
    emitMove(next, nextTurn);

    if (w) {
      setWinner(w);
      if (w === playerMark) {
        setWins((n) => n + 1);
        onScoreSaved?.();
      }
      return;
    }

    if (!socketMode && mark === playerMark) {
      setTimeout(() => {
        const ai = cpuMove(next);
        if (ai == null) return;
        const after = [...next];
        after[ai] = cpuMark;
        const w2 = checkWinner(after);
        setBoard(after);
        setTurn('X');
        if (w2) {
          setWinner(w2);
          if (w2 === playerMark) {
            setWins((n) => n + 1);
            onScoreSaved?.();
          }
        }
      }, 400);
    }
  }, [board, winner, playerMark, cpuMark, socketMode, emitMove, onScoreSaved]);

  const reset = () => {
    setBoard(Array(9).fill(null));
    setTurn('X');
    setWinner(null);
    hapticTap(6);
  };

  const sendChallenge = () => {
    const socket = getSocket();
    if (socket) {
      socket.emit('ttt_challenge', { message: 'MAX Tic-Tac-Toe challenge!' });
      hapticTap(10);
      toast.info('Tic-Tac-Toe challenge sent!');
    }
  };

  const canPlay = !winner && (socketMode ? turn === playerMark : turn === playerMark);

  return (
    <div className="p-4 rounded-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
      <p className="font-mono text-[10px] mb-2" style={{ color: '#6B6B8A' }}>
        // MAX TIC-TAC-TOE vs {socketMode ? opponentName : 'CPU'}
      </p>

      <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
        {board.map((cell, i) => (
          <button
            key={i}
            type="button"
            disabled={!canPlay || cell}
            onClick={() => applyMove(i, playerMark)}
            className="aspect-square rounded-sm font-heading text-3xl font-bold disabled:opacity-60"
            style={{
              background: '#0A0A0F',
              border: '2px solid #252535',
              color: cell === 'X' ? '#00F5FF' : cell === 'O' ? '#FF006E' : '#252535',
              boxShadow: cell === 'X' ? '0 0 12px #00F5FF44' : cell === 'O' ? '0 0 12px #FF006E44' : 'none',
            }}
          >
            {cell || ''}
          </button>
        ))}
      </div>

      {winner && (
        <p className="text-center font-heading mt-4" style={{ color: winner === 'draw' ? '#FFB703' : winner === playerMark ? '#06D6A0' : '#FF006E' }}>
          {winner === 'draw' ? 'DRAW' : winner === playerMark ? 'YOU WIN' : 'MAX WINS'}
        </p>
      )}

      {winner === playerMark && <ShareScoreButton message="⭕ MAX Tic-Tac-Toe victory!" />}

      <button type="button" onClick={reset} className="hud-btn hud-btn-ghost w-full py-2 text-xs mt-3">RESET BOARD</button>
      {!socketMode && (
        <button type="button" onClick={sendChallenge} className="hud-btn w-full py-2 text-xs mt-2" style={{ border: '1px solid #00F5FF44', color: '#00F5FF' }}>
          📡 SEND CHALLENGE
        </button>
      )}
      <p className="text-center font-mono text-[10px] mt-2" style={{ color: '#6B6B8A' }}>SESSION WINS: {wins}</p>
      {onExit && <button type="button" onClick={onExit} className="w-full mt-2 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>EXIT</button>}
    </div>
  );
}
