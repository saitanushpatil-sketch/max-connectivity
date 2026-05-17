import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import MemeImage from '../ui/MemeImage';
import SkeletonGrid from '../ui/SkeletonGrid';
import CountUp from '../ui/CountUp';
import ShareScoreButton from './ShareScoreButton';
import { shuffle } from '../../utils/shuffle';
import hapticTap from '../../utils/haptic';

export default function MemeMatch({ onScoreSaved }) {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [seconds, setSeconds] = useState(0);
  const [done, setDone] = useState(false);
  const [best, setBest] = useState(null);
  const [prevBest, setPrevBest] = useState(null);
  const [newBest, setNewBest] = useState(false);
  const [loading, setLoading] = useState(true);
  const lockRef = useRef(false);
  const timerRef = useRef(null);
  const finalSecondsRef = useRef(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    setLoading(true);
    setDone(false);
    setFlipped([]);
    setMatched([]);
    setSeconds(0);
    setNewBest(false);
    lockRef.current = false;
    stopTimer();

    try {
      const [memeRes, statsRes] = await Promise.all([
        api.get('/games/match/memes'),
        api.get('/games/stats').catch(() => ({ data: { stats: {} } })),
      ]);
      setPrevBest(statsRes.data.stats?.memeMatchBestTime ?? null);

      const pairs = [];
      (memeRes.data.memes || []).forEach((m, i) => {
        pairs.push({ id: `${i}a`, pairKey: i, url: m.url, name: m.name });
        pairs.push({ id: `${i}b`, pairKey: i, url: m.url, name: m.name });
      });
      setCards(shuffle(pairs));
    } catch {
      setCards([]);
    }
    setLoading(false);
  }, [stopTimer]);

  useEffect(() => {
    start();
    return stopTimer;
  }, [start, stopTimer]);

  useEffect(() => {
    if (loading || done) return;
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return stopTimer;
  }, [loading, done, stopTimer]);

  const totalPairs = cards.length / 2;

  const flip = (cardId) => {
    if (lockRef.current || done) return;
    if (flipped.includes(cardId)) return;

    const card = cards.find((c) => c.id === cardId);
    if (!card || matched.includes(card.pairKey)) return;
    if (flipped.length >= 2) return;

    hapticTap(5);
    const next = [...flipped, cardId];
    setFlipped(next);

    if (next.length === 2) {
      lockRef.current = true;
      const [a, b] = next.map((id) => cards.find((c) => c.id === id));

      if (a.pairKey === b.pairKey) {
        const m = [...matched, a.pairKey];
        setMatched(m);
        setFlipped([]);
        lockRef.current = false;
        hapticTap(12);

        if (m.length === totalPairs) {
          stopTimer();
          setSeconds((sec) => {
            finalSecondsRef.current = sec;
            setDone(true);
            api
              .post('/games/match', { seconds: sec })
              .then(({ data }) => {
                const saved = data.bestTime;
                setBest(saved);
                if (prevBest === null || sec < prevBest) setNewBest(true);
                onScoreSaved?.();
              })
              .catch(() => setBest(sec));
            return sec;
          });
        }
      } else {
        setTimeout(() => {
          setFlipped([]);
          lockRef.current = false;
        }, 700);
      }
    }
  };

  if (loading) {
    return (
      <div className="p-4 rounded-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
        <SkeletonGrid count={16} cols={4} />
      </div>
    );
  }

  if (!cards.length) {
    return (
      <div className="text-center py-8">
        <p className="font-mono text-xs" style={{ color: '#6B6B8A' }}>
          FAILED TO LOAD MEMES
        </p>
        <button type="button" onClick={start} className="hud-btn hud-btn-primary mt-3 px-4 py-2 text-xs active:scale-95">
          RETRY
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
      <div className="flex justify-between mb-3 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>
        <span>⏱ {seconds}s</span>
        <span>
          PAIRS {matched.length}/{totalPairs}
        </span>
        {best != null && <span style={{ color: '#06D6A0' }}>BEST {best}s</span>}
      </div>

      <div className="match-grid grid grid-cols-4 gap-2" style={{ perspective: '800px' }}>
        {cards.map((card) => {
          const isMatched = matched.includes(card.pairKey);
          const isFlipped = flipped.includes(card.id) || isMatched;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => flip(card.id)}
              disabled={isMatched || (lockRef.current && !flipped.includes(card.id))}
              className={`match-card aspect-square rounded-sm ${isFlipped ? 'match-card-flipped' : ''}`}
              style={{
                border: `1px solid ${isMatched ? '#06D6A0' : '#252535'}`,
              }}
            >
              <div className="match-card-inner">
                <div className="match-card-back flex items-center justify-center">
                  <span className="font-heading font-bold text-lg" style={{ color: '#00F5FF44' }}>
                    ?
                  </span>
                </div>
                <div className="match-card-front relative overflow-hidden">
                  <MemeImage src={card.url} alt={card.name} fill className="w-full h-full" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {done && (
        <>
          {newBest && (
            <p
              className="font-heading text-center mt-4 text-xl font-bold new-best-pop"
              style={{ color: '#FFB703', textShadow: '0 0 20px rgba(255,183,3,0.6)' }}
            >
              NEW BEST!
            </p>
          )}
          <p className="font-heading text-xl text-center mt-4" style={{ color: '#00F5FF' }}>
            CLEARED IN <CountUp value={seconds} suffix="s" />
          </p>
          <ShareScoreButton message={`🎴 MEME MATCH: ${seconds}s on MAX Connectivity`} />
          <button
            type="button"
            onClick={start}
            className="hud-btn hud-btn-primary w-full py-2 rounded-sm text-xs mt-2 active:scale-95"
          >
            PLAY AGAIN
          </button>
        </>
      )}
    </div>
  );
}
