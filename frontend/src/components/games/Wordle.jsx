import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import ShareScoreButton from './ShareScoreButton';
import hapticTap from '../../utils/haptic';
import { WORDLE_WORDS, getDailyWord } from './wordleWords';

const MAX_ROWS = 6;
const COLS = 5;
const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

function evaluateGuess(guess, answer) {
  const result = Array(COLS).fill('absent');
  const used = Array(COLS).fill(false);
  const ansArr = answer.split('');

  guess.split('').forEach((ch, i) => {
    if (ch === ansArr[i]) {
      result[i] = 'correct';
      used[i] = true;
    }
  });

  guess.split('').forEach((ch, i) => {
    if (result[i] === 'correct') return;
    const idx = ansArr.findIndex((a, j) => !used[j] && a === ch);
    if (idx >= 0) {
      result[i] = 'present';
      used[idx] = true;
    }
  });

  return result;
}

const CELL_COLORS = {
  empty: { bg: '#0A0A0F', border: '#252535', color: '#E8E8FF' },
  filled: { bg: '#12121A', border: '#00F5FF44', color: '#E8E8FF' },
  correct: { bg: '#06D6A0', border: '#06D6A0', color: '#0A0A0F' },
  present: { bg: '#FFB703', border: '#FFB703', color: '#0A0A0F' },
  absent: { bg: '#252535', border: '#252535', color: '#6B6B8A' },
};

export default function Wordle({ onExit, onScoreSaved }) {
  const [answer] = useState(() => getDailyWord());
  const [guesses, setGuesses] = useState([]);
  const [current, setCurrent] = useState('');
  const [status, setStatus] = useState('playing');
  const [keyState, setKeyState] = useState({});

  const submit = useCallback(async () => {
    if (current.length !== COLS) return;
    const word = current.toUpperCase();
    if (!WORDLE_WORDS.includes(word)) {
      hapticTap([20, 20]);
      return;
    }

    const evals = evaluateGuess(word, answer);
    const nextGuesses = [...guesses, { word, evals }];
    setGuesses(nextGuesses);
    setCurrent('');

    const nextKeyState = { ...keyState };
    word.split('').forEach((ch, i) => {
      const rank = { absent: 0, present: 1, correct: 2 };
      const prev = nextKeyState[ch];
      if (!prev || rank[evals[i]] > rank[prev]) nextKeyState[ch] = evals[i];
    });
    setKeyState(nextKeyState);
    hapticTap(8);

    if (word === answer) {
      setStatus('won');
      const scoreVal = MAX_ROWS - nextGuesses.length + 1;
      try {
        await api.post('/games/wordle/score', { score: scoreVal });
        onScoreSaved?.();
      } catch {
        /* ignore */
      }
      return;
    }

    if (nextGuesses.length >= MAX_ROWS) setStatus('lost');
  }, [current, guesses, answer, keyState, onScoreSaved]);

  useEffect(() => {
    const onKey = (e) => {
      if (status !== 'playing') return;
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      } else if (e.key === 'Backspace') {
        setCurrent((c) => c.slice(0, -1));
      } else if (/^[a-zA-Z]$/.test(e.key) && current.length < COLS) {
        setCurrent((c) => (c + e.key.toUpperCase()).slice(0, COLS));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, status, submit]);

  const pressKey = (k) => {
    if (status !== 'playing') return;
    if (k === 'ENTER') submit();
    else if (k === '⌫') setCurrent((c) => c.slice(0, -1));
    else if (current.length < COLS) setCurrent((c) => (c + k).slice(0, COLS));
  };

  const rows = Array.from({ length: MAX_ROWS }, (_, r) => {
    if (r < guesses.length) return guesses[r];
    if (r === guesses.length) return { word: current.padEnd(COLS, ' '), evals: Array(COLS).fill('empty'), live: true };
    return { word: '     ', evals: Array(COLS).fill('empty') };
  });

  return (
    <div className="p-4 rounded-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
      <p className="font-mono text-[10px] mb-2" style={{ color: '#6B6B8A' }}>
        // MAX WORDLE — DAILY PROTOCOL
      </p>

      <div className="flex flex-col gap-1.5 items-center mb-4">
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-1.5">
            {row.word.split('').map((ch, ci) => {
              const ev = row.evals?.[ci] || (ch.trim() ? 'filled' : 'empty');
              const st = CELL_COLORS[ev] || CELL_COLORS.empty;
              return (
                <div
                  key={ci}
                  className="flex items-center justify-center font-heading font-bold rounded-sm"
                  style={{
                    width: 52,
                    height: 52,
                    background: st.bg,
                    border: `2px solid ${st.border}`,
                    color: st.color,
                    fontSize: 22,
                  }}
                >
                  {ch.trim() || ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {status === 'won' && (
        <>
          <p className="text-center font-heading" style={{ color: '#06D6A0' }}>MAX DECODED IN {guesses.length}!</p>
          <ShareScoreButton message={`🟩 MAX Wordle solved in ${guesses.length}/6`} />
        </>
      )}
      {status === 'lost' && (
        <p className="text-center font-heading" style={{ color: '#FF006E' }}>
          ANSWER: {answer}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-1 items-center">
        {KEY_ROWS.map((row) => (
          <div key={row} className="flex gap-1">
            {row.split('').map((k) => {
              const st = keyState[k];
              const colors = st ? CELL_COLORS[st] : { bg: '#0A0A0F', border: '#252535', color: '#E8E8FF' };
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => pressKey(k)}
                  className="px-2 py-3 rounded-sm font-mono text-xs font-bold min-w-[28px]"
                  style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.color }}
                >
                  {k}
                </button>
              );
            })}
          </div>
        ))}
        <div className="flex gap-1 w-full justify-center mt-1">
          <button type="button" onClick={() => pressKey('ENTER')} className="px-4 py-3 rounded-sm font-mono text-[10px]" style={{ background: '#00F5FF22', color: '#00F5FF', border: '1px solid #00F5FF' }}>ENTER</button>
          <button type="button" onClick={() => pressKey('⌫')} className="px-4 py-3 rounded-sm font-mono text-[10px]" style={{ background: '#252535', color: '#E8E8FF' }}>⌫</button>
        </div>
      </div>

      {onExit && <button type="button" onClick={onExit} className="w-full mt-3 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>EXIT</button>}
    </div>
  );
}
