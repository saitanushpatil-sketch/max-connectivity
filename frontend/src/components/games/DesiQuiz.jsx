import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import ShareScoreButton from './ShareScoreButton';
import hapticTap from '../../utils/haptic';
import { shuffle } from '../../utils/shuffle';

const ALL_QUESTIONS = [
  {
    q: 'Which actor is known as "Megastar" in Telugu cinema?',
    options: ['NTR', 'Chiranjeevi', 'Mahesh Babu', 'Prabhas'],
    answer: 1,
  },
  {
    q: 'Who directed the film "Baahubali"?',
    options: ['Rajamouli', 'Sukumar', 'Trivikram', 'Koratala Siva'],
    answer: 0,
  },
  {
    q: '"RRR" won an Oscar for which category?',
    options: ['Best Picture', 'Best Original Song', 'Best Director', 'Best Actor'],
    answer: 1,
  },
  {
    q: 'Which Bollywood film features the dialogue "Kitne aadmi the?"',
    options: ['Sholay', 'Deewar', 'Don', 'Agneepath'],
    answer: 0,
  },
  {
    q: 'Who played Rancho in "3 Idiots"?',
    options: ['Shah Rukh Khan', 'Aamir Khan', 'Salman Khan', 'Hrithik Roshan'],
    answer: 1,
  },
  {
    q: 'Telugu film industry is popularly called?',
    options: ['Kollywood', 'Tollywood', 'Mollywood', 'Sandalwood'],
    answer: 1,
  },
  {
    q: 'Which actress starred in "Queen" (2014)?',
    options: ['Deepika Padukone', 'Kangana Ranaut', 'Priyanka Chopra', 'Anushka Sharma'],
    answer: 1,
  },
  {
    q: '"Pushpa" lead actor Allu Arjun is from which state\'s film industry?',
    options: ['Tamil', 'Telugu', 'Kannada', 'Malayalam'],
    answer: 1,
  },
  {
    q: 'Who composed music for most Rajinikanth 80s hits (Bollywood crossover fame)?',
    options: ['Ilaiyaraaja', 'AR Rahman', 'Anirudh', 'Harris Jayaraj'],
    answer: 0,
  },
  {
    q: 'Which film popularized "Maa ki ch**" dialogue in recent Bollywood?',
    options: ['Gully Boy', 'Gangs of Wasseypur', 'Sacred Games', 'Mirzapur'],
    answer: 1,
  },
  {
    q: 'Vijay Deverakonda rose to fame with which Telugu film?',
    options: ['Arjun Reddy', 'Pushpa', 'RRR', 'Jersey'],
    answer: 0,
  },
  {
    q: 'Who is called "King Khan" in Bollywood?',
    options: ['Salman Khan', 'Aamir Khan', 'Shah Rukh Khan', 'Akshay Kumar'],
    answer: 2,
  },
  {
    q: 'Which Telugu star is nicknamed "Prince"?',
    options: ['Ram Charan', 'Mahesh Babu', 'NTR Jr', 'Allu Arjun'],
    answer: 1,
  },
  {
    q: '"Dangal" is based on which sport?',
    options: ['Cricket', 'Wrestling', 'Hockey', 'Boxing'],
    answer: 1,
  },
  {
    q: 'Samantha Ruth Prabhu debuted prominently in which industry?',
    options: ['Only Bollywood', 'Telugu/Tamil', 'Malayalam only', 'Kannada only'],
    answer: 1,
  },
  {
    q: 'Which song from "Slumdog Millionaire" won an Oscar?',
    options: ['Chaiyya Chaiyya', 'Jai Ho', 'Kal Ho Naa Ho', 'Tum Hi Ho'],
    answer: 1,
  },
  {
    q: 'Prabhas played Amarendra Baahubali in how many parts (theatrical)?',
    options: ['One', 'Two', 'Three', 'Four'],
    answer: 1,
  },
  {
    q: 'Who directed "PK" starring Aamir Khan?',
    options: ['Karan Johar', 'Rajkumar Hirani', 'Sanjay Leela Bhansali', 'Anurag Kashyap'],
    answer: 1,
  },
  {
    q: 'Telugu word "Bava" in film titles often refers to?',
    options: ['Brother-in-law', 'Father', 'Uncle from mother side', 'Cousin'],
    answer: 0,
  },
  {
    q: 'Which actress played Silk Smitha in "The Dirty Picture"?',
    options: ['Vidya Balan', 'Kangana Ranaut', 'Tabu', 'Kareena Kapoor'],
    answer: 0,
  },
];

const TIMER_SEC = 10;

export default function DesiQuiz({ onExit, onScoreSaved }) {
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_SEC);
  const [selected, setSelected] = useState(null);
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
    setQuestions(shuffle(ALL_QUESTIONS).slice(0, 10));
    setIdx(0);
    setScore(0);
    setSelected(null);
    setDone(false);
    setTimeLeft(TIMER_SEC);
    hapticTap(8);
  };

  const finish = async (finalScore) => {
    setDone(true);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const { data } = await api.post('/games/desi-quiz/score', { score: finalScore });
      setHigh(data.highScore ?? finalScore);
      onScoreSaved?.();
    } catch {
      setHigh((h) => Math.max(h, finalScore));
    }
  };

  const next = useCallback((wasCorrect) => {
    setScore((prev) => {
      const nextScore = wasCorrect ? prev + 1 : prev;
      if (idx + 1 >= questions.length) {
        setTimeout(() => finish(nextScore), 0);
      } else {
        setIdx((i) => i + 1);
        setSelected(null);
        setTimeLeft(TIMER_SEC);
      }
      return nextScore;
    });
  }, [idx, questions.length, finish]);

  useEffect(() => {
    if (!questions.length || done || selected !== null) return undefined;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          next(false);
          return TIMER_SEC;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [questions, idx, done, selected, next]);

  const pick = (oi) => {
    if (selected !== null || done) return;
    setSelected(oi);
    const correct = oi === questions[idx].answer;
    if (correct) hapticTap(12);
    else hapticTap([20, 40]);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(() => next(correct), 700);
  };

  const q = questions[idx];

  return (
    <div className="p-4 rounded-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
      <div className="flex justify-between mb-2 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>
        <span>Q {questions.length ? idx + 1 : 0}/10</span>
        <span>SCORE <span style={{ color: '#00F5FF' }}>{score}</span></span>
        <span>TIME <span style={{ color: timeLeft <= 3 ? '#FF006E' : '#FFB703' }}>{timeLeft}s</span></span>
      </div>

      {!questions.length && (
        <button type="button" onClick={start} className="hud-btn w-full py-3 text-xs" style={{ border: '1px solid #00F5FF', color: '#00F5FF' }}>
          START DESI QUIZ (10/20)
        </button>
      )}

      {q && !done && (
        <>
          <p className="font-heading text-sm mb-4 leading-snug" style={{ color: '#E8E8FF' }}>{q.q}</p>
          <div className="flex flex-col gap-2">
            {q.options.map((opt, i) => {
              let border = '#252535';
              let bg = '#0A0A0F';
              if (selected !== null) {
                if (i === q.answer) { border = '#06D6A0'; bg = '#06D6A022'; }
                else if (i === selected) { border = '#FF006E'; bg = '#FF006E22'; }
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
        </>
      )}

      {done && (
        <>
          <p className="text-center font-heading text-xl mt-2" style={{ color: '#06D6A0' }}>{score}/10</p>
          <p className="text-center font-mono text-[10px]" style={{ color: '#6B6B8A' }}>BEST: {high}/10 · BANK: 20 Q</p>
          <ShareScoreButton message={`🎬 MAX Desi Quiz: ${score}/10`} />
          <button type="button" onClick={start} className="hud-btn hud-btn-ghost w-full py-2 text-xs mt-2">PLAY AGAIN</button>
        </>
      )}

      {onExit && <button type="button" onClick={onExit} className="w-full mt-2 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>EXIT</button>}
    </div>
  );
}
