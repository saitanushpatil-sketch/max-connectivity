import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import ShareScoreButton from './ShareScoreButton';

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export default function MemeMatch() {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [seconds, setSeconds] = useState(0);
  const [done, setDone] = useState(false);
  const [best, setBest] = useState(null);
  const [loading, setLoading] = useState(true);
  const lockRef = useRef(false);

  const start = async () => {
    setLoading(true);
    setDone(false);
    setFlipped([]);
    setMatched([]);
    setSeconds(0);
    try {
      const { data } = await api.get('/games/match/memes');
      const pairs = [];
      (data.memes || []).forEach((m, i) => {
        pairs.push({ id: `${i}a`, pairKey: i, url: m.url, name: m.name });
        pairs.push({ id: `${i}b`, pairKey: i, url: m.url, name: m.name });
      });
      setCards(shuffle(pairs));
    } catch {
      setCards([]);
    }
    setLoading(false);
  };

  useEffect(() => { start(); }, []);

  useEffect(() => {
    if (loading || done) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [loading, done]);

  const flip = (cardId) => {
    if (lockRef.current || flipped.includes(cardId) || matched.includes(cards.find((c) => c.id === cardId)?.pairKey)) return;
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
        if (m.length === cards.length / 2) {
          setSeconds((sec) => {
            setDone(true);
            api.post('/games/match', { seconds: sec }).then(({ data }) => setBest(data.bestTime)).catch(() => {});
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
    return <div className="flex justify-center py-12 gap-1"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>;
  }

  return (
    <div className="p-4 rounded-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
      <div className="flex justify-between mb-3 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>
        <span>⏱ {seconds}s</span>
        <span>PAIRS {matched.length}/{cards.length / 2}</span>
        {best && <span style={{ color: '#06D6A0' }}>BEST {best}s</span>}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {cards.map((card) => {
          const isFlipped = flipped.includes(card.id) || matched.includes(card.pairKey);
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => flip(card.id)}
              className="aspect-square rounded-sm overflow-hidden relative"
              style={{
                border: `1px solid ${matched.includes(card.pairKey) ? '#06D6A0' : '#252535'}`,
                transform: 'translateZ(0)',
                transition: 'transform 0.35s',
                transformStyle: 'preserve-3d',
              }}
            >
              {isFlipped ? (
                <img src={card.url} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center font-heading font-bold text-lg"
                  style={{ background: '#0A0A0F', color: '#00F5FF44', border: '1px dashed #00F5FF33' }}
                >
                  ?
                </div>
              )}
            </button>
          );
        })}
      </div>

      {done && (
        <>
          <p className="font-heading text-xl text-center mt-4" style={{ color: '#00F5FF' }}>
            CLEARED IN {seconds}s
          </p>
          <ShareScoreButton message={`🎴 MEME MATCH: ${seconds}s on MAX Connectivity`} />
          <button type="button" onClick={start} className="hud-btn hud-btn-primary w-full py-2 rounded-sm text-xs mt-2">
            PLAY AGAIN
          </button>
        </>
      )}
    </div>
  );
}
