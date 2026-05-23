import { useState, useEffect, useCallback, useRef } from 'react';
import hapticTap from '../../utils/haptic';
import api from '../../utils/api';

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;

export default function Snake({ onExit, onScoreSaved }) {
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [dir, setDir] = useState({ x: 1, y: 0 });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const dirRef = useRef(dir);

  const moveSnake = useCallback(() => {
    if (gameOver || !isPlaying) return;
    setSnake(prev => {
      const head = prev[0];
      const newHead = { x: head.x + dirRef.current.x, y: head.y + dirRef.current.y };
      
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE || prev.some(s => s.x === newHead.x && s.y === newHead.y)) {
        setGameOver(true);
        return prev;
      }
      
      const newSnake = [newHead, ...prev];
      if (newHead.x === food.x && newHead.y === food.y) {
        hapticTap(10);
        setScore(s => s + 10);
        setFood({ x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) });
      } else {
        newSnake.pop();
      }
      return newSnake;
    });
  }, [food, gameOver, isPlaying]);

  useEffect(() => {
    if (isPlaying && !gameOver) {
      const interval = setInterval(moveSnake, INITIAL_SPEED);
      return () => clearInterval(interval);
    }
  }, [isPlaying, gameOver, moveSnake]);

  useEffect(() => {
    const handleKey = (e) => {
      if (!isPlaying) return;
      const keyMap = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } };
      if (keyMap[e.key]) {
        const newDir = keyMap[e.key];
        if (dirRef.current.x + newDir.x !== 0 || dirRef.current.y + newDir.y !== 0) {
          dirRef.current = newDir;
          setDir(newDir);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isPlaying]);

  useEffect(() => {
    if (gameOver && score > 0) {
      api.post('/games/score', { gameId: 'snake', score }).then(() => onScoreSaved?.()).catch(() => {});
    }
  }, [gameOver]);

  const startGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setDir({ x: 1, y: 0 });
    dirRef.current = { x: 1, y: 0 };
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
  };

  const handleTouchStart = (e) => {
    if (!isPlaying || gameOver) return;
    const touch = e.touches[0];
    const { clientX, clientY } = touch;
    const cw = window.innerWidth / 2;
    const ch = window.innerHeight / 2;
    const dx = clientX - cw;
    const dy = clientY - ch;
    let newDir = dirRef.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      newDir = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
    } else {
      newDir = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
    }
    if (dirRef.current.x + newDir.x !== 0 || dirRef.current.y + newDir.y !== 0) {
      dirRef.current = newDir;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0A0F]" onTouchStart={handleTouchStart}>
      <div className="flex justify-between items-center p-4">
        <span className="font-mono text-[#00F5FF]">SCORE: {score}</span>
        <button onClick={onExit} className="text-[#6B6B8A] font-mono">EXIT</button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div style={{
          width: '100%', maxWidth: 350, aspectRatio: '1/1',
          background: '#12121A', border: '2px solid #252535',
          position: 'relative', overflow: 'hidden'
        }}>
          {!isPlaying && !gameOver ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <button onClick={startGame} className="hud-btn bg-[#00F5FF] text-black px-6 py-2 rounded font-bold">START</button>
            </div>
          ) : (
            <>
              <div style={{
                position: 'absolute',
                left: `${(food.x / GRID_SIZE) * 100}%`, top: `${(food.y / GRID_SIZE) * 100}%`,
                width: `${100 / GRID_SIZE}%`, height: `${100 / GRID_SIZE}%`,
                background: '#FF006E', borderRadius: '50%'
              }} />
              {snake.map((seg, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  left: `${(seg.x / GRID_SIZE) * 100}%`, top: `${(seg.y / GRID_SIZE) * 100}%`,
                  width: `${100 / GRID_SIZE}%`, height: `${100 / GRID_SIZE}%`,
                  background: '#00F5FF', border: '1px solid #12121A'
                }} />
              ))}
              {gameOver && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4">
                  <span className="text-[#FF006E] font-bold text-2xl font-mono">GAME OVER</span>
                  <button onClick={startGame} className="hud-btn bg-[#00F5FF] text-black px-6 py-2 rounded font-bold">PLAY AGAIN</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="p-4 text-center text-[#6B6B8A] font-mono text-xs">Swipe to move</div>
    </div>
  );
}
