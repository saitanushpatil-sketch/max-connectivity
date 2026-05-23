import { useState, useEffect, useRef } from 'react';
import hapticTap from '../../utils/haptic';
import api from '../../utils/api';

const SENTENCES = [
  "The quick brown fox jumps over the lazy dog.",
  "To be or not to be that is the question.",
  "All that glitters is not gold.",
  "I think therefore I am.",
  "A journey of a thousand miles begins with a single step.",
  "May the Force be with you.",
  "Houston we have a problem.",
  "Life is like a box of chocolates.",
  "Keep your friends close but your enemies closer.",
  "There is no place like home."
];

export default function TypeRacer({ onExit, onScoreSaved }) {
  const [target, setTarget] = useState('');
  const [input, setInput] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [wpm, setWpm] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const inputRef = useRef(null);

  const startGame = () => {
    setTarget(SENTENCES[Math.floor(Math.random() * SENTENCES.length)]);
    setInput('');
    setStartTime(null);
    setWpm(0);
    setIsDone(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  useEffect(() => {
    if (input.length === 1 && !startTime) {
      setStartTime(Date.now());
    }

    if (input === target && target.length > 0) {
      setIsDone(true);
      const timeMin = (Date.now() - startTime) / 60000;
      const words = target.split(' ').length;
      const calculatedWpm = Math.round(words / timeMin);
      setWpm(calculatedWpm);
      hapticTap(10);
      api.post('/games/score', { gameId: 'type-racer', score: calculatedWpm }).then(() => onScoreSaved?.()).catch(() => {});
    }
  }, [input, target, startTime]);

  return (
    <div className="flex flex-col h-full bg-[#0A0A0F]">
      <div className="flex justify-between items-center p-4">
        <span className="font-mono text-[#8B5CF6]">WPM: {wpm}</span>
        <button onClick={onExit} className="text-[#6B6B8A] font-mono">EXIT</button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-[500px] mx-auto w-full gap-8">
        {!target ? (
          <button onClick={startGame} className="hud-btn bg-[#8B5CF6] text-white px-6 py-2 rounded font-bold">START</button>
        ) : isDone ? (
          <div className="text-center">
            <h2 className="text-4xl font-bold font-mono text-[#8B5CF6] mb-2">{wpm} WPM</h2>
            <p className="text-[#6B6B8A] mb-8 font-mono">Great typing speed!</p>
            <button onClick={startGame} className="hud-btn border border-[#8B5CF6] text-[#8B5CF6] px-6 py-2 rounded font-bold">RACE AGAIN</button>
          </div>
        ) : (
          <>
            <div className="text-left w-full text-2xl font-mono leading-relaxed" style={{ color: '#3A3A4A' }}>
              {target.split('').map((char, i) => {
                let color = '#3A3A4A';
                if (i < input.length) {
                  color = input[i] === char ? '#06D6A0' : '#FF006E';
                }
                return <span key={i} style={{ color, textShadow: i < input.length && input[i] === char ? '0 0 8px rgba(6,214,160,0.5)' : 'none' }}>{char}</span>;
              })}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full bg-[#12121A] border-2 border-[#252535] focus:border-[#8B5CF6] rounded-xl px-4 py-4 text-white font-mono text-lg outline-none"
              placeholder="Type here..."
              autoFocus
            />
          </>
        )}
      </div>
    </div>
  );
}
