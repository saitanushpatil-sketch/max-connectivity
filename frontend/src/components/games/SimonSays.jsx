import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import ShareScoreButton from './ShareScoreButton';
import hapticTap from '../../utils/haptic';

const PADS = [
  { id: 0, color: '#00F5FF', freq: 329.63, label: 'CYAN' },
  { id: 1, color: '#FF006E', freq: 392.0, label: 'PINK' },
  { id: 2, color: '#06D6A0', freq: 493.88, label: 'GREEN' },
  { id: 3, color: '#FFB703', freq: 587.33, label: 'AMBER' },
];

function playTone(ctx, freq, duration = 0.22) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.value = 0.15;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export default function SimonSays({ onExit, onScoreSaved }) {
  const [sequence, setSequence] = useState([]);
  const [step, setStep] = useState(-1);
  const [playerTurn, setPlayerTurn] = useState(false);
  const [inputIdx, setInputIdx] = useState(0);
  const [active, setActive] = useState(null);
  const [score, setScore] = useState(0);
  const [high, setHigh] = useState(0);
  const [over, setOver] = useState(false);
  const [playing, setPlaying] = useState(false);

  const audioRef = useRef(null);
  const seqRef = useRef([]);

  const loadHigh = useCallback(async () => {
    try {
      const { data } = await api.get('/games/stats');
      setHigh(data.stats?.simonHighScore || 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadHigh();
    audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => audioRef.current?.close();
  }, [loadHigh]);

  const flash = useCallback((padId) => {
    setActive(padId);
    const pad = PADS[padId];
    if (audioRef.current) playTone(audioRef.current, pad.freq);
    setTimeout(() => setActive(null), 320);
  }, []);

  const playSequence = useCallback(async (seq) => {
    setPlayerTurn(false);
    for (let i = 0; i < seq.length; i += 1) {
      await new Promise((r) => setTimeout(r, 450));
      flash(seq[i]);
      await new Promise((r) => setTimeout(r, 350));
    }
    setPlayerTurn(true);
    setInputIdx(0);
  }, [flash]);

  const start = () => {
    const first = [Math.floor(Math.random() * 4)];
    seqRef.current = first;
    setSequence(first);
    setScore(0);
    setOver(false);
    setPlaying(true);
    setStep(0);
    hapticTap(8);
    playSequence(first);
  };

  const nextRound = useCallback(() => {
    const next = [...seqRef.current, Math.floor(Math.random() * 4)];
    seqRef.current = next;
    setSequence(next);
    setScore(next.length - 1);
    playSequence(next);
  }, [playSequence]);

  const fail = useCallback(async () => {
    setOver(true);
    setPlaying(false);
    setPlayerTurn(false);
    hapticTap([30, 50, 30]);
    const final = score;
    try {
      const { data } = await api.post('/games/simon/score', { score: final });
      setHigh(data.highScore ?? final);
      onScoreSaved?.();
    } catch {
      setHigh((h) => Math.max(h, final));
    }
  }, [score, onScoreSaved]);

  const onPad = (id) => {
    if (!playerTurn || over) return;
    flash(id);
    hapticTap(6);
    if (sequence[inputIdx] !== id) {
      fail();
      return;
    }
    const ni = inputIdx + 1;
    setInputIdx(ni);
    if (ni >= sequence.length) {
      setPlayerTurn(false);
      setTimeout(nextRound, 600);
    }
  };

  return (
    <div className="p-4 rounded-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
      <div className="flex justify-between mb-4 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>
        <span>LEVEL <span style={{ color: '#00F5FF' }}>{score}</span></span>
        <span>BEST <span style={{ color: '#06D6A0' }}>{high}</span></span>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-[240px] mx-auto">
        {PADS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPad(p.id)}
            className="h-24 rounded-sm font-mono text-[9px] tracking-widest transition-all active:scale-95"
            style={{
              background: active === p.id ? p.color : `${p.color}22`,
              border: `2px solid ${p.color}`,
              color: active === p.id ? '#0A0A0F' : p.color,
              boxShadow: active === p.id ? `0 0 24px ${p.color}` : 'none',
              opacity: playerTurn || !playing ? 1 : 0.7,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {!playing && !over && (
        <button type="button" onClick={start} className="hud-btn w-full mt-6 py-3 rounded-sm text-xs" style={{ border: '1px solid #00F5FF', color: '#00F5FF' }}>
          START SIMON
        </button>
      )}
      {over && (
        <>
          <p className="text-center font-heading mt-4" style={{ color: '#FF006E' }}>SEQUENCE BROKEN</p>
          <ShareScoreButton message={`🎵 MAX Simon: level ${score}`} />
          <button type="button" onClick={start} className="hud-btn hud-btn-ghost w-full py-2 text-xs mt-2">RETRY</button>
        </>
      )}
      {onExit && <button type="button" onClick={onExit} className="w-full mt-2 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>EXIT</button>}
    </div>
  );
}
