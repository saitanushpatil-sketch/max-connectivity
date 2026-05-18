import { useState, useRef, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import hapticTap from '../../utils/haptic';

const ROUNDS = 5;
const MIN_DELAY = 1500;
const MAX_DELAY = 5000;

// ─── Web Audio beep ───────────────────────────────────────────────
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch { /* ignore */ }
}

// ─── Rating ───────────────────────────────────────────────────────
function getRating(ms) {
  if (ms < 150) return { stars: 5, label: 'STARK LEVEL', color: '#00F5FF' };
  if (ms < 250) return { stars: 4, label: 'ELITE OPERATOR', color: '#06D6A0' };
  if (ms < 350) return { stars: 3, label: 'TRAINED AGENT', color: '#FFB703' };
  if (ms < 500) return { stars: 2, label: 'STANDARD HUMAN', color: '#F97316' };
  return { stars: 1, label: 'JARVIS IS CONCERNED', color: '#FF006E' };
}

// ─── Stars ────────────────────────────────────────────────────────
function Stars({ count, color }) {
  return (
    <div className="flex gap-1 justify-center">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ fontSize: 22, color: i < count ? color : '#252535', transition: 'color 0.3s', filter: i < count ? `drop-shadow(0 0 6px ${color})` : 'none' }}>⭐</span>
      ))}
    </div>
  );
}

// ─── Leaderboard entry ────────────────────────────────────────────
function LBEntry({ entry, rank }) {
  const initials = (entry.displayName || entry.username || '?').slice(0, 2).toUpperCase();
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ background: rank <= 3 ? 'rgba(0,245,255,0.06)' : 'transparent' }}>
      <span style={{ minWidth: 28, textAlign: 'center', fontFamily: 'monospace', fontSize: rank <= 3 ? 18 : 12, color: rank <= 3 ? '#FFB703' : '#6B6B8A' }}>
        {rank <= 3 ? medals[rank - 1] : `#${rank}`}
      </span>
      <div style={{ width: 30, height: 30, borderRadius: '50%', background: entry.avatarColor || '#00F5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#0A0A0F', flexShrink: 0 }}>{initials}</div>
      <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, color: '#E8E8FF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.displayName || entry.username}</span>
      <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#00F5FF', flexShrink: 0 }}>{entry.avgMs}ms</span>
    </div>
  );
}

// ─── Boot sequence ────────────────────────────────────────────────
const BOOT_LINES = [
  'INITIALIZING STARK RESPONSE TEST...',
  'Neural sync..................... OK',
  'Reflex calibration............. READY',
  'Operator profile............... LOADED',
];

function BootSequence({ onComplete }) {
  const [lines, setLines] = useState([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let lineI = 0;
    const addLine = () => {
      if (lineI < BOOT_LINES.length) {
        setLines((prev) => [...prev, BOOT_LINES[lineI]]);
        lineI++;
        setProgress(Math.round((lineI / BOOT_LINES.length) * 100));
        setTimeout(addLine, 400);
      } else {
        setTimeout(onComplete, 500);
      }
    };
    setTimeout(addLine, 200);
  }, [onComplete]);

  return (
    <div className="flex flex-col p-6 rounded-xl gap-4" style={{ background: '#0A0A0F', border: '1px solid #252535', minHeight: 280 }}>
      <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#00F5FF', letterSpacing: 2 }}>// STARK INDUSTRIES RESPONSE LAB</div>
      <div className="flex flex-col gap-2 flex-1">
        {lines.map((line, i) => (
          <div key={i} style={{ fontFamily: 'monospace', fontSize: 12, color: i === lines.length - 1 ? '#06D6A0' : '#6B6B8A', animation: 'fadeIn 0.3s ease' }}>
            {line}
          </div>
        ))}
      </div>
      {/* Progress bar */}
      <div style={{ height: 3, background: '#252535', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #00F5FF, #06D6A0)', transition: 'width 0.4s ease', borderRadius: 2 }} />
      </div>
    </div>
  );
}

// ─── Standby Screen ───────────────────────────────────────────────
function StandbyScreen() {
  const [angle, setAngle] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setAngle((a) => (a + 2) % 360), 16);
    return () => clearInterval(id);
  }, []);
  const pulse = 0.6 + Math.sin(Date.now() / 600) * 0.4;

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-10">
      {/* Animated HUD circles */}
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        {[50, 38, 26].map((r, i) => (
          <svg key={i} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: `rotate(${angle * (i % 2 ? 1 : -1) * (i + 1) * 0.5}deg)` }}>
            <circle cx="60" cy="60" r={r} fill="none" stroke={['#00F5FF', '#FF006E', '#06D6A0'][i]} strokeWidth="1.5" strokeDasharray={`${r * 0.6} ${r * 0.4}`} opacity={0.6} />
          </svg>
        ))}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 9, color: '#00F5FF', letterSpacing: 1 }}>READY</div>
      </div>
      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 18, fontWeight: 700, color: '#6B6B8A', letterSpacing: 4, animation: 'pulse 1.5s ease infinite' }}>
        STANDBY OPERATOR
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export default function ReactionTest({ onExit, onScoreSaved }) {
  const [phase, setPhase] = useState('idle'); // idle | boot | standby | waiting | go | result | false | done
  const [round, setRound] = useState(0);
  const [times, setTimes] = useState([]);
  const [lastTime, setLastTime] = useState(null);
  const [result, setResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  const startRef = useRef(null);
  const timeoutRef = useRef(null);
  const canTapRef = useRef(false);

  const loadBoard = useCallback(async () => {
    try {
      const { data } = await api.get('/games/reaction/leaderboard');
      setLeaderboard(data.leaderboard || []);
    } catch { setLeaderboard([]); }
  }, []);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  const clearDelay = () => { if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; } };

  const startWaiting = useCallback(() => {
    setPhase('waiting');
    canTapRef.current = false;
    const delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
    timeoutRef.current = setTimeout(() => {
      setPhase('go');
      canTapRef.current = true;
      startRef.current = performance.now();
      playBeep();
      hapticTap(15);
    }, delay);
  }, []);

  const startRound = useCallback(() => {
    clearDelay();
    setPhase('standby');
    setTimeout(startWaiting, 800);
  }, [startWaiting]);

  const startGame = useCallback(() => {
    clearDelay();
    setTimes([]); setRound(0); setResult(null); setLastTime(null);
    setPhase('boot');
    hapticTap(8);
  }, []);

  const finishGame = useCallback(async (allTimes) => {
    setPhase('done');
    try {
      const { data } = await api.post('/games/reaction', { times: allTimes });
      setResult(data);
      onScoreSaved?.();
      loadBoard();
    } catch {
      const avg = Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length);
      setResult({ avgMs: avg });
    }
  }, [onScoreSaved, loadBoard]);

  const handleTap = useCallback(async () => {
    if (phase === 'waiting' || phase === 'standby') {
      clearDelay();
      canTapRef.current = false;
      setPhase('false');
      hapticTap([30, 50, 30]);
      setTimeout(() => startRound(), 1500);
      return;
    }
    if (phase !== 'go' || !canTapRef.current) return;

    canTapRef.current = false;
    const ms = Math.round(performance.now() - startRef.current);
    const nextTimes = [...times, ms];
    setLastTime(ms);
    setTimes(nextTimes);
    hapticTap(10);

    if (round + 1 >= ROUNDS) {
      await finishGame(nextTimes);
    } else {
      setRound((r) => r + 1);
      setPhase('result');
      setTimeout(() => startRound(), 1200);
    }
  }, [phase, times, round, startRound, finishGame]);

  const handleAction = () => {
    if (phase === 'idle' || phase === 'done') startGame();
    else handleTap();
  };

  useEffect(() => () => clearDelay(), []);

  const rating = result ? getRating(result.avgMs) : null;

  return (
    <div className="flex flex-col gap-4 p-4" style={{ minHeight: '100%' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none} }
        @keyframes tapExplode { 0%{transform:scale(1);opacity:1}100%{transform:scale(1.15);opacity:0.8} }
      `}</style>

      {/* BOOT */}
      {phase === 'boot' && <BootSequence onComplete={() => startRound()} />}

      {/* GO! full screen tap area */}
      {phase === 'go' && (
        <button
          type="button"
          onClick={handleTap}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: '#00F5FF', border: 'none', cursor: 'pointer', animation: 'tapExplode 0.3s ease-out' }}
        >
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 900, fontSize: 'clamp(60px, 20vw, 120px)', color: '#0A0A0F', lineHeight: 1, letterSpacing: 4 }}>⚡ TAP!</div>
          <div style={{ fontFamily: 'monospace', fontSize: 14, color: 'rgba(10,10,15,0.7)', marginTop: 12 }}>NOW NOW NOW</div>
        </button>
      )}

      {/* FALSE START */}
      {phase === 'false' && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 40, fontWeight: 900, color: '#FF006E', textShadow: '0 0 30px rgba(255,0,110,0.6)', letterSpacing: 4 }}>TOO EARLY</div>
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#6B6B8A' }}>Wait for the cyan flash...</div>
        </div>
      )}

      {/* IDLE */}
      {phase === 'idle' && (
        <div className="flex flex-col gap-4">
          <div className="text-center py-4">
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 28, fontWeight: 900, color: '#00F5FF', textShadow: '0 0 20px rgba(0,245,255,0.4)', letterSpacing: 4, lineHeight: 1.2 }}>
              JARVIS<br />CALIBRATION
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#6B6B8A', marginTop: 8, letterSpacing: 2 }}>5-ROUND REFLEX TEST</div>
          </div>
          <button
            type="button"
            onClick={startGame}
            className="w-full py-5 rounded-xl"
            style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 18, letterSpacing: 4, color: '#0A0A0F', background: '#00F5FF', boxShadow: '0 0 30px rgba(0,245,255,0.4)' }}
          >
            INITIATE TEST →
          </button>
        </div>
      )}

      {/* STANDBY / WAITING */}
      {(phase === 'standby' || phase === 'waiting') && (
        <button type="button" onClick={handleTap} className="w-full flex flex-col rounded-xl" style={{ background: '#0A0A0F', border: '1px solid #252535', cursor: 'pointer' }}>
          <StandbyScreen />
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#6B6B8A', textAlign: 'center', padding: '8px 0 16px', letterSpacing: 2 }}>
            ROUND {round + 1}/{ROUNDS} · DO NOT TAP YET
          </div>
        </button>
      )}

      {/* RESULT (between rounds) */}
      {phase === 'result' && lastTime !== null && (
        <div className="flex flex-col items-center gap-3 py-8">
          {(() => {
            const r = getRating(lastTime);
            return (
              <>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 60, fontWeight: 900, color: '#00F5FF', textShadow: '0 0 30px rgba(0,245,255,0.5)' }}>{lastTime}ms</div>
                <Stars count={r.stars} color={r.color} />
                <div style={{ fontFamily: 'monospace', fontSize: 13, color: r.color, letterSpacing: 2 }}>{r.label}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#6B6B8A' }}>NEXT ROUND IN 1s...</div>
              </>
            );
          })()}
        </div>
      )}

      {/* DONE — Final summary */}
      {phase === 'done' && result && (
        <div className="flex flex-col gap-4">
          <div className="text-center py-4 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(0,245,255,0.06), rgba(6,214,160,0.04))', border: '1px solid rgba(0,245,255,0.2)' }}>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, letterSpacing: 4, color: '#6B6B8A', marginBottom: 8 }}>CALIBRATION COMPLETE</div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 64, fontWeight: 900, color: '#00F5FF', textShadow: '0 0 30px rgba(0,245,255,0.5)', lineHeight: 1 }}>
              {result.avgMs}<span style={{ fontSize: 28 }}>ms</span>
            </div>
            {rating && (
              <>
                <div className="mt-3"><Stars count={rating.stars} color={rating.color} /></div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 18, fontWeight: 700, color: rating.color, letterSpacing: 3, marginTop: 8 }}>{rating.label}</div>
              </>
            )}
          </div>

          {/* Individual rounds */}
          <div className="flex flex-col gap-1">
            {times.map((t, i) => {
              const r = getRating(t);
              const barPct = Math.min(100, (t / 800) * 100);
              return (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: '#12121A', border: '1px solid #252535' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#6B6B8A', minWidth: 60 }}>ROUND {i + 1}</span>
                  <div style={{ flex: 1, height: 6, background: '#252535', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${barPct}%`, background: `linear-gradient(90deg, #06D6A0, #FFB703, #FF006E)`, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: r.color, minWidth: 50, textAlign: 'right' }}>{t}ms</span>
                </div>
              );
            })}
          </div>

          <button type="button" onClick={startGame} className="w-full py-4 rounded-xl" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 16, letterSpacing: 3, color: '#0A0A0F', background: '#00F5FF', boxShadow: '0 0 20px rgba(0,245,255,0.3)' }}>
            NEXT ROUND →
          </button>

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #252535' }}>
              <div className="px-4 py-3" style={{ background: '#0A0A0F', borderBottom: '1px solid #252535' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#00F5FF', letterSpacing: 2 }}>// GLOBAL LEADERBOARD</span>
              </div>
              <div className="flex flex-col gap-1 p-2">
                {leaderboard.map((e, i) => <LBEntry key={e._id || i} entry={e} rank={i + 1} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {onExit && <button type="button" onClick={onExit} style={{ fontFamily: 'monospace', fontSize: 10, color: '#6B6B8A', letterSpacing: 2, textAlign: 'center', paddingTop: 8 }}>EXIT</button>}
    </div>
  );
}
