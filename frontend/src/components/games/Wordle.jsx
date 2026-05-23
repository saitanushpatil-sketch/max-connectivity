import { useState, useEffect } from 'react';
import hapticTap from '../../utils/haptic';
import api from '../../utils/api';

const WORDS = ['REACT', 'GHOST', 'NINJA', 'STEALTH', 'CYBER', 'HACKER', 'NEXUS', 'PIXEL', 'PROXY', 'CLOUD'];

export default function Wordle({ onExit, onScoreSaved }) {
  const [target, setTarget] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const startGame = () => {
    setTarget(WORDS[Math.floor(Math.random() * WORDS.length)]);
    setGuesses([]);
    setCurrentGuess('');
    setGameOver(false);
    setWon(false);
  };

  useEffect(() => { startGame(); }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameOver) return;
      if (e.key === 'Enter') {
        if (currentGuess.length === target.length) {
          const newGuesses = [...guesses, currentGuess];
          setGuesses(newGuesses);
          setCurrentGuess('');
          if (currentGuess === target) {
            setWon(true);
            setGameOver(true);
            hapticTap(10);
            api.post('/games/score', { gameId: 'wordle', score: 1 }).then(() => onScoreSaved?.()).catch(() => {});
          } else if (newGuesses.length >= 6) {
            setGameOver(true);
          }
        }
      } else if (e.key === 'Backspace') {
        setCurrentGuess(p => p.slice(0, -1));
      } else if (/^[A-Za-z]$/.test(e.key) && currentGuess.length < target.length) {
        setCurrentGuess(p => p + e.key.toUpperCase());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGuess, gameOver, guesses, target]);

  const getLetterStyle = (char, i, guess) => {
    if (!target) return {};
    if (target[i] === char) return { bg: '#06D6A0', border: '#06D6A0' };
    if (target.includes(char)) return { bg: '#FFB703', border: '#FFB703' };
    return { bg: '#252535', border: '#252535' };
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0A0F]">
      <div className="flex justify-between items-center p-4">
        <span className="font-mono text-[#06D6A0]">WORDLE</span>
        <button onClick={onExit} className="text-[#6B6B8A] font-mono">EXIT</button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {gameOver && (
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold font-mono" style={{ color: won ? '#06D6A0' : '#FF006E' }}>
              {won ? 'HACK SUCCESSFUL' : `FAILED. WORD WAS: ${target}`}
            </h2>
            <button onClick={startGame} className="mt-4 hud-btn bg-[#06D6A0] text-black px-6 py-2 rounded font-bold">PLAY AGAIN</button>
          </div>
        )}
        <div className="grid gap-2">
          {Array(6).fill(0).map((_, rowIdx) => {
            const isCurrent = rowIdx === guesses.length;
            const guess = isCurrent ? currentGuess : guesses[rowIdx] || '';
            return (
              <div key={rowIdx} className="flex gap-2">
                {Array(target.length || 5).fill(0).map((_, colIdx) => {
                  const char = guess[colIdx] || '';
                  let style = { bg: '#12121A', border: '#252535' };
                  if (rowIdx < guesses.length) {
                    style = getLetterStyle(char, colIdx, guess);
                  } else if (char) {
                    style.border = '#6B6B8A';
                  }
                  return (
                    <div key={colIdx} className="w-12 h-12 flex items-center justify-center font-bold text-2xl font-mono text-white rounded" style={{
                      background: style.bg,
                      border: `2px solid ${style.border}`,
                      boxShadow: rowIdx < guesses.length && style.bg !== '#252535' ? `0 0 10px ${style.bg}88` : 'none'
                    }}>
                      {char}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="mt-8 text-center text-[#6B6B8A] font-mono text-xs">Type letters and press Enter</div>
      </div>
    </div>
  );
}
