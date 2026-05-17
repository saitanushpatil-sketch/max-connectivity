import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import ShareScoreButton from './ShareScoreButton';
import hapticTap from '../../utils/haptic';
import { GAME_PHRASES } from './gamePhrases';

function pickPhrase() {
  return GAME_PHRASES[Math.floor(Math.random() * GAME_PHRASES.length)];
}

function calcWpm(chars, seconds) {
  if (seconds <= 0) return 0;
  return Math.round((chars / 5) / (seconds / 60));
}

export default function TypeRacer({ onExit, onScoreSaved }) {
  const [phrase, setPhrase] = useState('');
  const [typed, setTyped] = useState('');
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [best, setBest] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const startRef = useRef(null);

  const loadBoard = useCallback(async () => {
    try {
      const [statsRes, lbRes] = await Promise.all([
        api.get('/games/stats'),
        api.get('/games/typer/leaderboard'),
      ]);
      setBest(statsRes.data.stats?.typerBestWpm || 0);
      setLeaderboard(lbRes.data.leaderboard || []);
    } catch {
      setLeaderboard([]);
    }
  }, []);

  useEffect(() => {
    loadBoard();
    setPhrase(pickPhrase());
  }, [loadBoard]);

  const reset = () => {
    setPhrase(pickPhrase());
    setTyped('');
    setStarted(false);
    setDone(false);
    setWpm(0);
    startRef.current = null;
  };

  const finish = async (text, startTime) => {
    const elapsed = (performance.now() - startTime) / 1000;
    const finalWpm = calcWpm(text.length, elapsed);
    setWpm(finalWpm);
    setDone(true);
    hapticTap(12);
    try {
      await api.post('/games/typer/score', { wpm: finalWpm });
      onScoreSaved?.();
      loadBoard();
    } catch {
      setBest((b) => Math.max(b, finalWpm));
    }
  };

  const onChange = (e) => {
    const val = e.target.value;
    if (!started) {
      setStarted(true);
      startRef.current = performance.now();
    }
    if (done) return;

    if (val.length > phrase.length) return;
    setTyped(val);

    if (val === phrase) {
      finish(val, startRef.current);
    }
  };

  const charColor = (i) => {
    if (i >= typed.length) return '#6B6B8A';
    if (typed[i] === phrase[i]) return '#06D6A0';
    return '#FF006E';
  };

  return (
    <div className="p-4 rounded-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
      <p className="font-mono text-[10px] mb-2" style={{ color: '#6B6B8A' }}>// MAX TYPE RACER</p>

      <div className="p-3 rounded-sm mb-3 font-mono text-sm leading-relaxed break-words" style={{ background: '#0A0A0F', border: '1px solid #252535' }}>
        {phrase.split('').map((ch, i) => (
          <span key={i} style={{ color: charColor(i) }}>{ch}</span>
        ))}
      </div>

      <input
        type="text"
        value={typed}
        onChange={onChange}
        disabled={done}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder="start typing..."
        className="w-full p-3 rounded-sm font-mono text-sm outline-none"
        style={{ background: '#0A0A0F', border: '1px solid #00F5FF44', color: '#E8E8FF' }}
      />

      {done && (
        <>
          <p className="text-center font-heading text-2xl mt-4" style={{ color: '#00F5FF' }}>{wpm} WPM</p>
          <p className="text-center font-mono text-[10px]" style={{ color: '#6B6B8A' }}>PERSONAL BEST: {best} WPM</p>
          <ShareScoreButton message={`⌨️ MAX TypeRacer: ${wpm} WPM`} />
          <button type="button" onClick={reset} className="hud-btn hud-btn-ghost w-full py-2 text-xs mt-2">NEXT PHRASE</button>
        </>
      )}

      {leaderboard.length > 0 && (
        <div className="mt-4 pt-3" style={{ borderTop: '1px solid #252535' }}>
          <p className="font-mono text-[10px] mb-2" style={{ color: '#6B6B8A' }}>// TOP TYPERS</p>
          {leaderboard.map((e, i) => (
            <div key={e._id || i} className="flex justify-between py-1.5 font-mono text-[10px]">
              <span style={{ color: i < 3 ? '#FFB703' : '#E8E8FF' }}>#{i + 1} {e.displayName || e.username}</span>
              <span style={{ color: '#00F5FF' }}>{e.wpm} WPM</span>
            </div>
          ))}
        </div>
      )}

      {!done && typed.length > 0 && (
        <button type="button" onClick={reset} className="w-full mt-2 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>SKIP PHRASE</button>
      )}
      {onExit && <button type="button" onClick={onExit} className="w-full mt-2 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>EXIT</button>}
    </div>
  );
}
