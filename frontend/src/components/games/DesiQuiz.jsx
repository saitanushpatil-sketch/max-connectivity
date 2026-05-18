import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import ShareScoreButton from './ShareScoreButton';
import hapticTap from '../../utils/haptic';
import { shuffle } from '../../utils/shuffle';
import { ALL_QUESTIONS } from './desiQuizQuestions';

const TIMER_SEC = 12;
const BASE_PTS = 100;

function gradeForScore(correctCount) {
  if (correctCount >= 9) return 'TOLLYWOOD EXPERT 🎬';
  if (correctCount >= 7) return 'FILMY BHAI 🎭';
  if (correctCount >= 5) return 'CASUAL VIEWER 📺';
  return 'Bhai movie dekh 😂';
}

export default function DesiQuiz({ onExit, onScoreSaved }) {
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [points, setPoints] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_SEC);
  const [selected, setSelected] = useState(null);
  const [flash, setFlash] = useState(null);
  const [done, setDone] = useState(false);
  const [high, setHigh] = useState(0);
  const timerRef = useRef(null);

  const loadHigh = useCallback(async () => {
    try {
      const { data } = await api.get('/games/stats');
      setHigh(data.stats?.desiQuizHighScore || 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadHigh();
  }, [loadHigh]);

  const start = () => {
    setQuestions(shuffle([...ALL_QUESTIONS]).slice(0, 10));
    setIdx(0);
    setPoints(0);
    setCorrectCount(0);
    setCombo(0);
    setSelected(null);
    setDone(false);
    setTimeLeft(TIMER_SEC);
    setFlash(null);
    hapticTap(8);
  };

  const finish = async (finalCorrect) => {
    setDone(true);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const { data } = await api.post('/games/desi-quiz/score', { score: finalCorrect });
      setHigh(data.highScore ?? finalCorrect);
      onScoreSaved?.();
    } catch {
      setHigh((h) => Math.max(h, finalCorrect));
    }
  };

  const advance = useCallback((wasCorrect) => {
    let nextCombo = combo;
    let nextCorrect = correctCount;
    if (wasCorrect) {
      nextCombo = combo + 1;
      nextCorrect = correctCount + 1;
      let mult = 1;
      if (nextCombo >= 5) mult = 3;
      else if (nextCombo >= 3) mult = 2;
      const addPts = BASE_PTS * mult;
      setPoints((p) => p + addPts);
      setFlash('ok');
    } else {
      nextCombo = 0;
      setFlash('bad');
    }
    setCombo(nextCombo);
    setTimeout(() => setFlash(null), 350);

    if (idx + 1 >= questions.length) {
      finish(wasCorrect ? nextCorrect : correctCount);
    } else {
      setIdx((i) => i + 1);
      setSelected(null);
      setTimeLeft(TIMER_SEC);
    }
    if (wasCorrect) setCorrectCount(nextCorrect);
  }, [combo, correctCount, idx, questions.length, finish]);

  useEffect(() => {
    if (!questions.length || done || selected !== null) return undefined;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          advance(false);
          return TIMER_SEC;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [questions, idx, done, selected, advance]);

  const pick = (oi) => {
    if (selected !== null || done) return;
    setSelected(oi);
    const q = questions[idx];
    const correct = oi === q.answer;
    if (correct) hapticTap(12);
    else hapticTap([20, 40]);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(() => advance(correct), 650);
  };

  const q = questions[idx];
  const timerPct = questions.length ? (timeLeft / TIMER_SEC) * 100 : 100;

  return (
    <div
      className="p-4 rounded-sm min-h-[320px] transition-colors duration-200"
      style={{
        background: q?.color ? `${q.color}18` : '#12121A',
        border: `1px solid ${flash === 'ok' ? '#06D6A0' : flash === 'bad' ? '#FF006E' : '#252535'}`,
      }}
    >
      {questions.length > 0 && !done && (
        <div className="h-1 rounded-full mb-3 overflow-hidden" style={{ background: '#252535' }}>
          <div
            className="h-full transition-all duration-1000 linear"
            style={{
              width: `${timerPct}%`,
              background: timeLeft <= 4 ? 'linear-gradient(90deg, #FF006E, #FFB703)' : 'linear-gradient(90deg, #00F5FF, #06D6A0)',
            }}
          />
        </div>
      )}

      <div className="flex justify-between mb-2 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>
        <span>Q {questions.length ? idx + 1 : 0}/10</span>
        <span>PTS <span style={{ color: '#00F5FF' }}>{points}</span></span>
        <span>COMBO <span style={{ color: '#FF006E' }}>x{combo >= 5 ? 3 : combo >= 3 ? 2 : 1}</span></span>
      </div>

      {!questions.length && (
        <button type="button" onClick={start} className="hud-btn w-full py-3 text-xs" style={{ border: '1px solid #00F5FF', color: '#00F5FF' }}>
          START DESI QUIZ (10 FROM 25)
        </button>
      )}

      {q && !done && (
        <>
          <p className="font-mono text-[9px] mb-1" style={{ color: '#6B6B8A' }}>{q.movie}</p>
          <p className="font-heading text-sm mb-4 leading-snug" style={{ color: '#E8E8FF' }}>{q.q}</p>
          <div className="flex flex-col gap-2">
            {q.options.map((opt, i) => {
              let border = '#252535';
              let bg = '#0A0A0F';
              if (selected !== null) {
                if (i === q.answer) { border = '#06D6A0'; bg = '#06D6A033'; }
                else if (i === selected) { border = '#FF006E'; bg = '#FF006E33'; }
              }
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => pick(i)}
                  disabled={selected !== null}
                  className="p-3 rounded-sm text-left font-mono text-xs"
                  style={{ background: bg, border: `1px solid ${border}`, color: '#E8E8FF' }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {selected !== null && selected !== q.answer && (
            <p className="font-mono text-[10px] mt-2" style={{ color: '#06D6A0' }}>Correct: {q.options[q.answer]}</p>
          )}
        </>
      )}

      {done && (
        <>
          <p className="text-center font-heading text-xl mt-2" style={{ color: '#06D6A0' }}>{correctCount}/10</p>
          <p className="text-center font-heading text-sm mt-2" style={{ color: '#00F5FF' }}>{gradeForScore(correctCount)}</p>
          <p className="text-center font-mono text-[10px] mt-1" style={{ color: '#6B6B8A' }}>POINTS: {points} · BEST CORRECT: {high}/10</p>
          <ShareScoreButton message={`🎬 MAX Desi Quiz: ${correctCount}/10 (${points} pts)`} />
          <button type="button" onClick={start} className="hud-btn hud-btn-ghost w-full py-2 text-xs mt-2">PLAY AGAIN</button>
        </>
      )}

      {onExit && <button type="button" onClick={onExit} className="w-full mt-2 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>EXIT</button>}
    </div>
  );
}
