import { useState, useEffect } from 'react';
import hapticTap from '../../utils/haptic';
import api from '../../utils/api';

const QUOTES = [
  "THE MATRIX HAS YOU",
  "WAKE UP NEO",
  "FOLLOW THE WHITE RABBIT",
  "THERE IS NO SPOON",
  "I KNOW KUNG FU"
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export default function Cryptogram({ onExit, onScoreSaved }) {
  const [quote, setQuote] = useState("");
  const [cipher, setCipher] = useState({});
  const [guessMap, setGuessMap] = useState({});
  const [selectedChar, setSelectedChar] = useState(null);
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(false);

  const generateCipher = () => {
    let shuffled = ALPHABET.split('').sort(() => 0.5 - Math.random());
    const map = {};
    for (let i = 0; i < ALPHABET.length; i++) {
      map[ALPHABET[i]] = shuffled[i];
    }
    return map;
  };

  const nextPuzzle = () => {
    const nextQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    setQuote(nextQuote);
    setCipher(generateCipher());
    setGuessMap({});
    setSelectedChar(null);
    setSolved(false);
  };

  useEffect(() => { nextPuzzle(); }, []);

  const handleCharSelect = (c) => {
    if (!ALPHABET.includes(c) || solved) return;
    setSelectedChar(c);
  };

  const handleKeyPress = (e) => {
    if (solved || !selectedChar) return;
    const key = e.key.toUpperCase();
    if (key === 'BACKSPACE') {
      const newMap = { ...guessMap };
      delete newMap[selectedChar];
      setGuessMap(newMap);
      setSelectedChar(null);
    } else if (ALPHABET.includes(key)) {
      setGuessMap(prev => ({ ...prev, [selectedChar]: key }));
      setSelectedChar(null);
      hapticTap(10);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedChar, guessMap, solved]);

  useEffect(() => {
    if (!quote || solved) return;
    let isSolved = true;
    for (let char of quote) {
      if (ALPHABET.includes(char)) {
        const cipherChar = cipher[char];
        if (guessMap[cipherChar] !== char) {
          isSolved = false;
          break;
        }
      }
    }
    if (isSolved) {
      setSolved(true);
      setScore(s => s + 1);
      hapticTap(10);
      api.post('/games/score', { gameId: 'cryptogram', score: score + 1 }).then(() => onScoreSaved?.()).catch(() => {});
      setTimeout(() => nextPuzzle(), 2000);
    }
  }, [guessMap, quote, cipher]);

  return (
    <div className="flex flex-col h-full bg-[#0A0A0F]">
      <div className="flex justify-between items-center p-4">
        <span className="font-mono text-[#00F5FF]">SOLVED: {score}</span>
        <button onClick={onExit} className="text-[#6B6B8A] font-mono">EXIT</button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-[600px] mx-auto w-full gap-8">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-6">
          {quote.split(' ').map((word, wIdx) => (
            <div key={wIdx} className="flex gap-1">
              {word.split('').map((char, cIdx) => {
                const isLetter = ALPHABET.includes(char);
                const cipherChar = isLetter ? cipher[char] : char;
                const guessedChar = guessMap[cipherChar] || '';
                const isSelected = selectedChar === cipherChar;
                
                return (
                  <div key={cIdx} className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => handleCharSelect(cipherChar)}>
                    <div className="w-6 h-8 border-b-2 font-mono text-xl text-center" style={{
                      borderColor: isSelected ? '#00F5FF' : '#3A3A4A',
                      color: solved ? '#06D6A0' : '#E8E8FF',
                      textShadow: solved ? '0 0 10px #06D6A0' : 'none'
                    }}>
                      {isLetter ? guessedChar : char}
                    </div>
                    {isLetter && (
                      <span className="font-mono text-[10px] text-[#6B6B8A]">{cipherChar}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        
        {solved && (
          <div className="text-[#06D6A0] font-mono text-xl animate-pulse mt-8">ACCESS GRANTED</div>
        )}

        <div className="mt-auto text-center text-[#6B6B8A] font-mono text-xs p-4 bg-[#12121A] rounded-xl border border-[#252535]">
          Tap a letter and type to substitute.<br/>Decode the phrase.
        </div>
      </div>
    </div>
  );
}
