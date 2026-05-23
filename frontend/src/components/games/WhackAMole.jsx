import { useState, useEffect, useRef } from 'react';
import hapticTap from '../../utils/haptic';
import api from '../../utils/api';

export default function WhackAMole({ onExit, onScoreSaved }) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [activeMoles, setActiveMoles] = useState(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef(null);
  const moleTimerRef = useRef(null);

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setActiveMoles(new Set());
    setIsPlaying(true);
  };

  useEffect(() => {
    if (!isPlaying) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setIsPlaying(false);
          clearInterval(timerRef.current);
          clearInterval(moleTimerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    const spawnMole = () => {
      setActiveMoles(prev => {
        const next = new Set(prev);
        const pos = Math.floor(Math.random() * 9);
        next.add(pos);
        setTimeout(() => {
          setActiveMoles(current => {
            const copy = new Set(current);
            copy.delete(pos);
            return copy;
          });
        }, 800 + Math.random() * 1000);
        return next;
      });
      moleTimerRef.current = setTimeout(spawnMole, 400 + Math.random() * 800);
    };

    spawnMole();

    return () => {
      clearInterval(timerRef.current);
      clearTimeout(moleTimerRef.current);
    };
  }, [isPlaying]);

  useEffect(() => {
    if (timeLeft === 0 && score > 0) {
      api.post('/games/score', { gameId: 'whack-a-mole', score }).then(() => onScoreSaved?.()).catch(() => {});
    }
  }, [timeLeft]);

  const whack = (i) => {
    if (!isPlaying || !activeMoles.has(i)) return;
    hapticTap(10);
    setScore(s => s + 1);
    setActiveMoles(prev => {
      const next = new Set(prev);
      next.delete(i);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0A0F]">
      <div className="flex justify-between items-center p-4">
        <div className="flex flex-col">
          <span className="font-mono text-[#F97316]">SCORE: {score}</span>
          <span className="font-mono text-[#6B6B8A] text-xs">TIME: {timeLeft}s</span>
        </div>
        <button onClick={onExit} className="text-[#6B6B8A] font-mono">EXIT</button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {!isPlaying && timeLeft === 30 ? (
          <button onClick={startGame} className="hud-btn bg-[#F97316] text-black px-6 py-2 rounded font-bold">START</button>
        ) : !isPlaying && timeLeft === 0 ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold font-mono text-[#F97316] mb-4">TIME'S UP!</h2>
            <button onClick={startGame} className="hud-btn bg-[#F97316] text-black px-6 py-2 rounded font-bold">PLAY AGAIN</button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 w-full max-w-[350px] aspect-square bg-[#12121A] p-4 rounded-xl border border-[#252535]">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="relative rounded-full bg-[#0A0A0F] border-b-4 border-[#252535] overflow-hidden flex justify-center items-end" onClick={() => whack(i)}>
                <div style={{
                  width: '80%', height: '80%',
                  background: '#F97316',
                  borderRadius: '50% 50% 10% 10%',
                  transform: activeMoles.has(i) ? 'translateY(0)' : 'translateY(100%)',
                  transition: 'transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}>
                  <div className="absolute top-[20%] left-[20%] w-[15%] h-[15%] bg-black rounded-full" />
                  <div className="absolute top-[20%] right-[20%] w-[15%] h-[15%] bg-black rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
