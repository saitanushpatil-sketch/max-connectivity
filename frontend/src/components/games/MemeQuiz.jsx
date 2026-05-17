import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import MemeImage from '../ui/MemeImage';
import CountUp from '../ui/CountUp';
import ShareScoreButton from './ShareScoreButton';
import hapticTap from '../../utils/haptic';

const TIMER_MS = 10000;
const TICK_MS = 50;

function preloadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

export default function MemeQuiz({ onScoreSaved }) {
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState(100);
  const [selected, setSelected] = useState(null);
  const [done, setDone] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [phase, setPhase] = useState('loading');
  const [preloadProgress, setPreloadProgress] = useState(0);

  const scoreRef = useRef(0);
  const timerStartRef = useRef(null);
  const intervalRef = useRef(null);
  const answeredRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    setPhase('loading');
    setDone(false);
    setIdx(0);
    setScore(0);
    scoreRef.current = 0;
    setSelected(null);
    answeredRef.current = false;
    setPreloadProgress(0);
    clearTimer();

    try {
      const { data } = await api.get('/games/quiz/questions');
      const qs = data.questions || [];
      if (!qs.length) {
        setQuestions([]);
        setPhase('empty');
        return;
      }

      let loaded = 0;
      await Promise.all(
        qs.map(async (q) => {
          await preloadImage(q.url);
          loaded += 1;
          setPreloadProgress(Math.round((loaded / qs.length) * 100));
        })
      );

      setQuestions(qs);
      setPhase('playing');
      setProgress(100);
    } catch {
      setQuestions([]);
      setPhase('empty');
    }
  }, [clearTimer]);

  useEffect(() => {
    start();
    return clearTimer;
  }, [start, clearTimer]);

  const pickAnswer = useCallback(
    async (opt) => {
      if (answeredRef.current || phase !== 'playing') return;
      answeredRef.current = true;
      clearTimer();

      const correct = questions[idx].correctAnswer;
      const gotPoint = opt === correct;
      if (gotPoint) {
        scoreRef.current += 1;
        setScore(scoreRef.current);
        hapticTap(12);
      } else {
        hapticTap([20, 40, 20]);
      }

      setSelected(opt);

      setTimeout(async () => {
        if (idx + 1 >= questions.length) {
          const final = scoreRef.current;
          setDone(true);
          setPhase('done');
          try {
            const { data } = await api.post('/games/quiz/score', { score: final });
            setHighScore(data.highScore ?? final);
            onScoreSaved?.();
          } catch {
            setHighScore(final);
          }
        } else {
          setIdx((i) => i + 1);
          setSelected(null);
          answeredRef.current = false;
          setProgress(100);
        }
      }, 800);
    },
    [questions, idx, phase, clearTimer, onScoreSaved]
  );

  useEffect(() => {
    if (phase !== 'playing' || !questions.length || selected !== null) return;

    timerStartRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - timerStartRef.current;
      const remaining = Math.max(0, 1 - elapsed / TIMER_MS);
      setProgress(remaining * 100);
      if (remaining <= 0) {
        clearTimer();
        pickAnswer(null);
      }
    }, TICK_MS);

    return clearTimer;
  }, [idx, questions, phase, selected, pickAnswer, clearTimer]);

  if (phase === 'loading') {
    return (
      <div className="p-6 rounded-sm text-center" style={{ background: '#12121A', border: '1px solid #252535' }}>
        <p className="font-mono text-[10px] mb-3 tracking-widest" style={{ color: '#6B6B8A' }}>
          // PRELOADING MEME ASSETS
        </p>
        <div className="h-1 rounded-full overflow-hidden mb-2" style={{ background: '#0A0A0F' }}>
          <div
            className="h-full transition-all duration-200"
            style={{ width: `${preloadProgress}%`, background: '#00F5FF', boxShadow: '0 0 8px #00F5FF' }}
          />
        </div>
        <p className="font-heading text-xl font-bold" style={{ color: '#00F5FF' }}>
          {preloadProgress}%
        </p>
      </div>
    );
  }

  if (phase === 'empty') {
    return (
      <div className="text-center py-12">
        <p className="font-mono text-xs" style={{ color: '#6B6B8A' }}>
          NO QUESTIONS AVAILABLE
        </p>
        <button type="button" onClick={start} className="hud-btn hud-btn-primary mt-4 px-4 py-2 rounded-sm text-xs active:scale-95">
          RETRY
        </button>
      </div>
    );
  }

  if (done) {
    const finalScore = scoreRef.current;
    return (
      <div className="p-4 rounded-sm text-center" style={{ background: '#12121A', border: '1px solid #252535' }}>
        <p className="font-mono text-[10px] mb-2" style={{ color: '#6B6B8A' }}>
          // MISSION COMPLETE
        </p>
        <p className="font-heading text-4xl font-bold" style={{ color: '#00F5FF' }}>
          <CountUp value={finalScore} suffix="/10" />
        </p>
        <p className="font-mono text-xs mt-2" style={{ color: '#6B6B8A' }}>
          HIGH SCORE: <CountUp value={highScore} duration={800} />
        </p>
        <ShareScoreButton message={`🧠 MEME QUIZ SCORE: ${finalScore}/10 on MAX Connectivity`} />
        <button type="button" onClick={start} className="hud-btn hud-btn-primary w-full py-2 rounded-sm text-xs mt-2 active:scale-95">
          PLAY AGAIN
        </button>
      </div>
    );
  }

  const q = questions[idx];
  if (!q) return null;

  const timeLeft = Math.ceil((progress / 100) * 10);

  return (
    <div className="p-4 rounded-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
      <div className="flex justify-between mb-2 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>
        <span>Q{idx + 1}/10</span>
        <span style={{ color: timeLeft <= 3 ? '#FF006E' : '#FFB703' }}>⏱ {timeLeft}s</span>
        <span>SCORE {score}</span>
      </div>

      <div className="h-1 rounded-full overflow-hidden mb-3" style={{ background: '#0A0A0F' }}>
        <div
          className="h-full transition-none"
          style={{
            width: `${progress}%`,
            background: timeLeft <= 3 ? '#FF006E' : '#00F5FF',
            boxShadow: `0 0 8px ${timeLeft <= 3 ? '#FF006E' : '#00F5FF'}`,
          }}
        />
      </div>

      <div className="relative w-full aspect-video rounded-sm mb-4 overflow-hidden" style={{ border: '1px solid #252535' }}>
        <MemeImage src={q.url} alt="quiz meme" fill className="w-full h-full" priority />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {q.options.map((opt) => {
          let border = '#252535';
          let bg = '#0A0A0F';
          if (selected !== null) {
            if (opt === q.correctAnswer) {
              border = '#06D6A0';
              bg = 'rgba(6,214,160,0.15)';
            } else if (opt === selected) {
              border = '#FF006E';
              bg = 'rgba(255,0,110,0.15)';
            }
          }
          return (
            <button
              key={opt}
              type="button"
              disabled={selected !== null}
              onClick={() => pickAnswer(opt)}
              className="p-2 rounded-sm font-mono text-[10px] text-left truncate active:scale-95"
              style={{ border: `1px solid ${border}`, background: bg, color: '#E8E8FF' }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
