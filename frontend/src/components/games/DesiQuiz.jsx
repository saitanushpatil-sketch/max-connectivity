import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import hapticTap from '../../utils/haptic';
import { EASY_QUESTIONS, MEDIUM_QUESTIONS, HARD_QUESTIONS } from './desiQuizQuestions';

const TIMER_SEC = 10;
const BASE_PTS = 100;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function gradeForScore(c) {
  if (c >= 9) return { text: 'TOLLYWOOD MASTERMIND 🏆', color: '#FFD700', bg: 'rgba(255,215,0,0.08)' };
  if (c >= 7) return { text: 'FILMY BHAI 🎬', color: '#00F5FF', bg: 'rgba(0,245,255,0.08)' };
  if (c >= 5) return { text: 'CASUAL VIEWER 📺', color: '#FFB703', bg: 'rgba(255,183,3,0.08)' };
  return { text: 'First movie dekh bhai 😭', color: '#FF006E', bg: 'rgba(255,0,110,0.08)' };
}

// ─── Circular timer ───────────────────────────────────────────────
function CircularTimer({ timeLeft, total }) {
  const r = 24;
  const circumference = 2 * Math.PI * r;
  const pct = timeLeft / total;
  const dashOffset = circumference * (1 - pct);
  const color = pct > 0.5 ? '#00F5FF' : pct > 0.25 ? '#FFB703' : '#FF006E';

  return (
    <div style={{ position: 'relative', width: 60, height: 60 }}>
      <svg width="60" height="60" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="30" cy="30" r={r} fill="none" stroke="#252535" strokeWidth="4" />
        <circle
          cx="30" cy="30" r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.5s ease', filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 20, color }}>
        {timeLeft}
      </div>
    </div>
  );
}

// ─── Floating +points popup ───────────────────────────────────────
function PointsPopup({ pts }) {
  return (
    <div style={{ position: 'absolute', top: -30, right: 0, fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 22, color: '#FFD700', textShadow: '0 0 12px rgba(255,215,0,0.7)', pointerEvents: 'none', animation: 'pointsFloat 0.9s ease-out forwards', zIndex: 10 }}>
      +{pts}
    </div>
  );
}

// ─── Intro Screen ─────────────────────────────────────────────────
function IntroScreen({ onStart }) {
  const [diff, setDiff] = useState('medium');
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => { setTimeout(() => setAnimIn(true), 50); }, []);

  return (
    <div className="flex flex-col items-center gap-6 py-6" style={{ opacity: animIn ? 1 : 0, transform: animIn ? 'none' : 'translateY(30px)', transition: 'all 0.5s ease' }}>
      <div className="text-center">
        <div style={{ fontSize: 48, marginBottom: 4 }}>🎬</div>
        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 900, fontSize: 32, color: '#FFB703', textShadow: '0 0 20px rgba(255,183,3,0.5)', letterSpacing: 4, lineHeight: 1.1 }}>
          DESI MOVIE<br />QUIZ
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#6B6B8A', marginTop: 8, letterSpacing: 1 }}>
          Are you a true filmy bhai?
        </div>
      </div>

      {/* Difficulty pills */}
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#6B6B8A', letterSpacing: 2, textAlign: 'center', marginBottom: 4 }}>// SELECT DIFFICULTY</div>
        {[
          { key: 'easy', label: 'EASY', sub: 'Mega blockbusters', color: '#06D6A0' },
          { key: 'medium', label: 'MEDIUM', sub: 'Popular films', color: '#00F5FF' },
          { key: 'hard', label: 'HARD', sub: 'Obscure details', color: '#FF006E' },
        ].map(({ key, label, sub, color }) => (
          <button
            key={key}
            type="button"
            onClick={() => setDiff(key)}
            style={{
              padding: '14px 20px',
              borderRadius: 12,
              border: diff === key ? `2px solid ${color}` : '1px solid #252535',
              background: diff === key ? `rgba(${color === '#06D6A0' ? '6,214,160' : color === '#00F5FF' ? '0,245,255' : '255,0,110'},0.1)` : '#12121A',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              boxShadow: diff === key ? `0 0 16px ${color}33` : 'none',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 16, color: diff === key ? color : '#E8E8FF', letterSpacing: 2 }}>{label}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6B6B8A' }}>{sub}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onStart(diff)}
        className="w-full max-w-xs py-5 rounded-xl"
        style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 900, fontSize: 20, letterSpacing: 4, color: '#0A0A0F', background: '#FFB703', boxShadow: '0 0 30px rgba(255,183,3,0.5)', transition: 'transform 0.1s' }}
        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
        onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        🎬 START QUIZ
      </button>
    </div>
  );
}

// ─── Result Screen ────────────────────────────────────────────────
function ResultScreen({ correctCount, points, high, onRestart }) {
  const grade = gradeForScore(correctCount);
  const [shown, setShown] = useState(false);
  useEffect(() => { setTimeout(() => setShown(true), 100); }, []);

  return (
    <div className="flex flex-col items-center gap-5 py-6" style={{ opacity: shown ? 1 : 0, transition: 'opacity 0.5s' }}>
      {/* Certificate card */}
      <div
        className="w-full max-w-xs rounded-xl p-6 text-center"
        style={{ background: grade.bg, border: `2px solid ${grade.color}`, boxShadow: `0 0 30px ${grade.color}33` }}
      >
        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 15, letterSpacing: 3, color: '#6B6B8A', marginBottom: 8 }}>CERTIFICATE OF FILMINESS</div>
        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 900, fontSize: 28, color: grade.color, marginBottom: 16, lineHeight: 1.2 }}>{grade.text}</div>
        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 900, fontSize: 56, color: '#E8E8FF', lineHeight: 1 }}>{correctCount}<span style={{ fontSize: 24, color: '#6B6B8A' }}>/10</span></div>
        <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#6B6B8A', marginTop: 8 }}>
          POINTS: <span style={{ color: '#FFB703' }}>{points}</span> · BEST: <span style={{ color: '#00F5FF' }}>{high}/10</span>
        </div>
      </div>

      <button type="button" onClick={onRestart} className="w-full max-w-xs py-4 rounded-xl" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 16, letterSpacing: 3, color: '#0A0A0F', background: '#FFB703', boxShadow: '0 0 20px rgba(255,183,3,0.3)' }}>
        PLAY AGAIN 🎬
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export default function DesiQuiz({ onExit, onScoreSaved }) {
  const [screen, setScreen] = useState('intro'); // intro | game | done
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [points, setPoints] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_SEC);
  const [selected, setSelected] = useState(null);
  const [flashAns, setFlashAns] = useState(null); // 'ok' | 'bad'
  const [high, setHigh] = useState(0);
  const [ptsPopup, setPtsPopup] = useState(null);
  const timerRef = useRef(null);
  const correctRef = useRef(0);

  const loadHigh = useCallback(async () => {
    try {
      const { data } = await api.get('/games/stats');
      setHigh(data.stats?.desiQuizHighScore || 0);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { loadHigh(); }, [loadHigh]);

  const startGame = (difficulty) => {
    const pool = difficulty === 'easy' ? EASY_QUESTIONS : difficulty === 'hard' ? HARD_QUESTIONS : MEDIUM_QUESTIONS;
    const qs = shuffle(pool).slice(0, 10);
    setQuestions(qs);
    setIdx(0); setPoints(0); setCorrectCount(0); correctRef.current = 0;
    setCombo(0); setSelected(null); setFlashAns(null);
    setTimeLeft(TIMER_SEC);
    setScreen('game');
    hapticTap(8);
  };

  const finish = useCallback(async (finalCorrect) => {
    setScreen('done');
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const { data } = await api.post('/games/desi-quiz/score', { score: finalCorrect });
      setHigh(data.highScore ?? finalCorrect);
      onScoreSaved?.();
    } catch {
      setHigh((h) => Math.max(h, finalCorrect));
    }
  }, [onScoreSaved]);

  const advance = useCallback((wasCorrect) => {
    let nextCombo = combo;
    let nextCorrect = correctRef.current;
    let addPts = 0;

    if (wasCorrect) {
      nextCombo = combo + 1;
      nextCorrect += 1;
      correctRef.current = nextCorrect;
      const mult = nextCombo >= 5 ? 3 : nextCombo >= 3 ? 2 : 1;
      addPts = BASE_PTS * mult;
      setPoints((p) => p + addPts);
      setFlashAns('ok');
      setPtsPopup(addPts);
      setTimeout(() => setPtsPopup(null), 800);
      hapticTap(12);
    } else {
      nextCombo = 0;
      setFlashAns('bad');
      hapticTap([20, 40]);
    }
    setCombo(nextCombo);
    setCorrectCount(nextCorrect);
    setTimeout(() => setFlashAns(null), 400);

    if (idx + 1 >= questions.length) {
      finish(nextCorrect);
    } else {
      setTimeout(() => {
        setIdx((i) => i + 1);
        setSelected(null);
        setTimeLeft(TIMER_SEC);
      }, 700);
    }
  }, [combo, idx, questions.length, finish]);

  // Timer
  useEffect(() => {
    if (screen !== 'game' || selected !== null) return;
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
  }, [screen, idx, selected, advance]);

  const pick = (oi) => {
    if (selected !== null || screen !== 'game') return;
    setSelected(oi);
    if (timerRef.current) clearInterval(timerRef.current);
    const correct = oi === questions[idx].answer;
    setTimeout(() => advance(correct), 650);
  };

  const q = questions[idx];
  const comboMult = combo >= 5 ? 3 : combo >= 3 ? 2 : 1;

  if (screen === 'intro') return <><IntroScreen onStart={startGame} />{onExit && <button type="button" onClick={onExit} style={{ fontFamily: 'monospace', fontSize: 10, color: '#6B6B8A', display: 'block', margin: '0 auto 16px', letterSpacing: 2 }}>EXIT</button>}</>;
  if (screen === 'done') return <><ResultScreen correctCount={correctCount} points={points} high={high} onRestart={() => setScreen('intro')} />{onExit && <button type="button" onClick={onExit} style={{ fontFamily: 'monospace', fontSize: 10, color: '#6B6B8A', display: 'block', margin: '0 auto 16px', letterSpacing: 2 }}>EXIT</button>}</>;

  return (
    <div className="flex flex-col gap-4 p-4" style={{ minHeight: '100%' }}>
      <style>{`
        @keyframes pointsFloat { 0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-40px)} }
        @keyframes wrongShake { 0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)} }
        @keyframes correctPop { 0%{transform:scale(1)}50%{transform:scale(1.04)}100%{transform:scale(1)} }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#6B6B8A', letterSpacing: 2 }}>Q {idx + 1}/10</div>
        {combo >= 2 && (
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 16, color: '#FFB703', textShadow: '0 0 12px rgba(255,183,3,0.5)', letterSpacing: 2 }}>
            🔥 {comboMult}× COMBO
          </div>
        )}
        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 18, color: '#FFB703' }}>{points}</div>
      </div>

      {/* Circular timer + Question */}
      <div className="flex items-start gap-4">
        <CircularTimer timeLeft={timeLeft} total={TIMER_SEC} />
        <div
          style={{
            flex: 1,
            fontFamily: 'Rajdhani, sans-serif',
            fontWeight: 700,
            fontSize: 18,
            color: '#E8E8FF',
            lineHeight: 1.4,
          }}
        >
          {q?.q}
        </div>
      </div>

      {/* Answer grid 2×2 */}
      {q && (
        <div className="relative grid grid-cols-2 gap-3">
          {ptsPopup && <PointsPopup pts={ptsPopup} />}
          {q.options.map((opt, i) => {
            let borderColor = '#252535';
            let bg = '#12121A';
            let textColor = '#E8E8FF';
            let extraAnim = '';
            if (selected !== null) {
              if (i === q.answer) {
                borderColor = '#06D6A0'; bg = 'rgba(6,214,160,0.15)'; textColor = '#06D6A0';
                extraAnim = 'correctPop 0.3s ease';
              } else if (i === selected) {
                borderColor = '#FF006E'; bg = 'rgba(255,0,110,0.15)'; textColor = '#FF006E';
                extraAnim = 'wrongShake 0.3s ease';
              }
            }
            return (
              <button
                key={opt}
                type="button"
                onClick={() => pick(i)}
                disabled={selected !== null}
                style={{
                  padding: '16px 12px',
                  borderRadius: 12,
                  border: `2px solid ${borderColor}`,
                  background: bg,
                  color: textColor,
                  fontFamily: 'Rajdhani, sans-serif',
                  fontWeight: 600,
                  fontSize: 15,
                  textAlign: 'left',
                  lineHeight: 1.3,
                  transition: 'border-color 0.2s, background 0.2s',
                  animation: extraAnim || 'none',
                  boxShadow: selected !== null && i === q.answer ? '0 0 16px rgba(6,214,160,0.3)' : 'none',
                }}
              >
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: borderColor !== '#252535' ? borderColor : '#6B6B8A', marginRight: 8 }}>{String.fromCharCode(65 + i)})</span>
                {opt}
                {selected !== null && i === q.answer && <span style={{ marginLeft: 6 }}>✓</span>}
                {selected !== null && i === selected && i !== q.answer && <span style={{ marginLeft: 6 }}>✗</span>}
              </button>
            );
          })}
        </div>
      )}

      {onExit && <button type="button" onClick={onExit} style={{ fontFamily: 'monospace', fontSize: 10, color: '#6B6B8A', letterSpacing: 2, textAlign: 'center', marginTop: 'auto' }}>EXIT</button>}
    </div>
  );
}
