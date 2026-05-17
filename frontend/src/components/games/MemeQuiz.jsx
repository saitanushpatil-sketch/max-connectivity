import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import ShareScoreButton from './ShareScoreButton';

export default function MemeQuiz() {
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [selected, setSelected] = useState(null);
  const [done, setDone] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  const start = async () => {
    setLoading(true);
    setDone(false);
    setIdx(0);
    setScore(0);
    setSelected(null);
    try {
      const { data } = await api.get('/games/quiz/questions');
      setQuestions(data.questions || []);
    } catch {
      setQuestions([]);
    }
    setLoading(false);
    setTimeLeft(10);
  };

  useEffect(() => { start(); }, []);

  useEffect(() => {
    if (done || !questions.length || selected !== null) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          pickAnswer(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [idx, questions, done, selected]);

  const pickAnswer = async (opt) => {
    if (selected !== null) return;
    clearInterval(timerRef.current);
    setSelected(opt);
    const correct = questions[idx].correctAnswer;
    if (opt === correct) setScore((s) => s + 1);

    setTimeout(async () => {
      const gotPoint = opt === correct;
      const final = score + (gotPoint ? 1 : 0);
      if (gotPoint) setScore(final);
      if (idx + 1 >= questions.length) {
        setDone(true);
        try {
          const { data } = await api.post('/games/quiz/score', { score: final });
          setHighScore(data.highScore);
        } catch (_) {}
      } else {
        setIdx((i) => i + 1);
        setSelected(null);
        setTimeLeft(10);
      }
    }, 800);
  };

  if (loading) {
    return <div className="flex justify-center py-12 gap-1"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>;
  }

  if (done) {
    const finalScore = score; // updated before setDone
    return (
      <div className="p-4 rounded-sm text-center" style={{ background: '#12121A', border: '1px solid #252535' }}>
        <p className="font-heading text-3xl font-bold" style={{ color: '#00F5FF' }}>{finalScore}/10</p>
        <p className="font-mono text-xs mt-2" style={{ color: '#6B6B8A' }}>HIGH SCORE: {highScore}</p>
        <ShareScoreButton message={`🧠 MEME QUIZ SCORE: ${finalScore}/10 on MAX Connectivity`} />
        <button type="button" onClick={start} className="hud-btn hud-btn-primary w-full py-2 rounded-sm text-xs mt-2">PLAY AGAIN</button>
      </div>
    );
  }

  const q = questions[idx];
  if (!q) return <p className="font-mono text-xs text-center" style={{ color: '#6B6B8A' }}>No questions available</p>;

  return (
    <div className="p-4 rounded-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
      <div className="flex justify-between mb-3 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>
        <span>Q{idx + 1}/10</span>
        <span style={{ color: timeLeft <= 3 ? '#FF006E' : '#FFB703' }}>⏱ {timeLeft}s</span>
        <span>SCORE {score}</span>
      </div>
      <img src={q.url} alt="quiz" className="w-full rounded-sm mb-4 aspect-video object-cover" style={{ border: '1px solid #252535' }} />
      <div className="grid grid-cols-2 gap-2">
        {q.options.map((opt) => {
          let border = '#252535';
          let bg = '#0A0A0F';
          if (selected) {
            if (opt === q.correctAnswer) { border = '#06D6A0'; bg = 'rgba(6,214,160,0.15)'; }
            else if (opt === selected) { border = '#FF006E'; bg = 'rgba(255,0,110,0.15)'; }
          }
          return (
            <button
              key={opt}
              type="button"
              disabled={selected !== null}
              onClick={() => pickAnswer(opt)}
              className="p-2 rounded-sm font-mono text-[10px] text-left"
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
