import { useState, useEffect, useRef } from 'react';
import hapticTap from '../../utils/haptic';
import api from '../../utils/api';

const COLORS = ['#FF006E', '#00F5FF', '#06D6A0', '#FFB703'];

export default function SimonSays({ onExit, onScoreSaved }) {
  const [sequence, setSequence] = useState([]);
  const [userStep, setUserStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [activeColor, setActiveColor] = useState(null);
  const score = sequence.length > 0 ? sequence.length - 1 : 0;

  const playSequence = async (seq) => {
    setIsPlaying(true);
    for (let i = 0; i < seq.length; i++) {
      await new Promise(r => setTimeout(r, 400));
      setActiveColor(seq[i]);
      // Play sound here if needed
      await new Promise(r => setTimeout(r, 400));
      setActiveColor(null);
    }
    setIsPlaying(false);
  };

  const nextRound = (currentSeq) => {
    const nextColor = Math.floor(Math.random() * 4);
    const newSeq = [...currentSeq, nextColor];
    setSequence(newSeq);
    setUserStep(0);
    setTimeout(() => playSequence(newSeq), 800);
  };

  const startGame = () => {
    setGameOver(false);
    nextRound([]);
  };

  const handleColorClick = (idx) => {
    if (isPlaying || gameOver || sequence.length === 0) return;
    hapticTap(10);
    setActiveColor(idx);
    setTimeout(() => setActiveColor(null), 200);

    if (idx !== sequence[userStep]) {
      setGameOver(true);
      if (score > 0) {
        api.post('/games/score', { gameId: 'simon-says', score }).then(() => onScoreSaved?.()).catch(() => {});
      }
      return;
    }

    if (userStep === sequence.length - 1) {
      nextRound(sequence);
    } else {
      setUserStep(u => u + 1);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0A0F]">
      <div className="flex justify-between items-center p-4">
        <span className="font-mono text-[#00F5FF]">SCORE: {score}</span>
        <button onClick={onExit} className="text-[#6B6B8A] font-mono">EXIT</button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {gameOver ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold font-mono text-[#FF006E] mb-4">GAME OVER</h2>
            <button onClick={startGame} className="hud-btn bg-[#00F5FF] text-black px-6 py-2 rounded font-bold">TRY AGAIN</button>
          </div>
        ) : sequence.length === 0 ? (
          <button onClick={startGame} className="hud-btn bg-[#00F5FF] text-black px-6 py-2 rounded font-bold">START</button>
        ) : (
          <div className="grid grid-cols-2 gap-4 w-full max-w-[300px] aspect-square">
            {COLORS.map((color, i) => (
              <button
                key={i}
                onClick={() => handleColorClick(i)}
                style={{
                  background: color,
                  opacity: activeColor === i ? 1 : 0.3,
                  transform: activeColor === i ? 'scale(0.95)' : 'scale(1)',
                  borderRadius: '16px',
                  boxShadow: activeColor === i ? `0 0 30px ${color}` : 'none',
                  transition: 'all 0.1s'
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
