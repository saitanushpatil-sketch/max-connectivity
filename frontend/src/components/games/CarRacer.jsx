import { useRef, useEffect, useState, useCallback } from 'react';
import api from '../../utils/api';
import ShareScoreButton from './ShareScoreButton';
import hapticTap from '../../utils/haptic';

const LANES = 3;
const W = 360;
const H = 520;

export default function CarRacer({ onExit, onScoreSaved }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const stateRef = useRef({
    lane: 1,
    enemies: [],
    orbs: [],
    particles: [],
    speed: 2.2,
    dist: 0,
    score: 0,
    over: false,
    keys: {},
    tilt: 0,
    spawnT: 0,
    speedT: 0,
  });
  const [ui, setUi] = useState({ dist: 0, score: 0, speedKmh: 80, over: false, high: 0 });
  const highRef = useRef(0);
  const [explode, setExplode] = useState(0);

  const loadHigh = useCallback(async () => {
    try {
      const { data } = await api.get('/games/stats');
      highRef.current = data.stats?.carRacerHighScore || 0;
      setUi((u) => ({ ...u, high: highRef.current }));
    } catch { /* */ }
  }, []);

  useEffect(() => { loadHigh(); }, [loadHigh]);

  useEffect(() => {
    const onKey = (e) => { stateRef.current.keys[e.code] = e.type === 'keydown'; };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    const onTilt = (e) => { if (e.gamma != null) stateRef.current.tilt = Math.max(-1, Math.min(1, e.gamma / 30)); };
    window.addEventListener('deviceorientation', onTilt, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('deviceorientation', onTilt, true);
    };
  }, []);

  const loop = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const s = stateRef.current;
    if (s.over) return;

    const laneW = W / LANES;
    s.dist += s.speed * 0.4;
    s.score += s.speed * 0.15;
    s.spawnT += 1;
    s.speedT += 1;
    if (s.speedT > 600) { s.speedT = 0; s.speed += 0.12; }
    const spawnRate = Math.max(28, 55 - s.speed * 3);
    if (s.spawnT > spawnRate) {
      s.spawnT = 0;
      const lane = Math.floor(Math.random() * LANES);
      s.enemies.push({ lane, y: -60, w: laneW * 0.55, h: 46, hue: Math.random() > 0.5 ? '#FF006E' : '#FFB703' });
      if (Math.random() > 0.65) s.orbs.push({ lane, y: -30, r: 10 });
    }

    ctx.fillStyle = '#0A0A0F';
    ctx.fillRect(0, 0, W, 36);
    ctx.fillStyle = '#00F5FF';
    ctx.font = '12px monospace';
    ctx.fillText(`SPD ${Math.floor(80 + s.speed * 12)} km/h`, 8, 22);
    ctx.fillStyle = '#FFB703';
    ctx.fillText(`DIST ${Math.floor(s.dist)}m`, 120, 22);
    ctx.fillStyle = '#E8E8FF';
    ctx.fillText(`PTS ${Math.floor(s.score)}`, 240, 22);

    ctx.fillStyle = '#1A1A26';
    ctx.fillRect(0, 36, W, H - 36);
    ctx.strokeStyle = '#252535';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 36, W - 4, H - 40);
    ctx.strokeStyle = '#00F5FF55';
    ctx.setLineDash([14, 14]);
    ctx.beginPath();
    ctx.moveTo(laneW, 40);
    ctx.lineTo(laneW, H - 4);
    ctx.moveTo(laneW * 2, 40);
    ctx.lineTo(laneW * 2, H - 4);
    ctx.stroke();
    ctx.setLineDash([]);

    if (s.keys.ArrowLeft || s.tilt < -0.35) s.lane = Math.max(0, s.lane - 0.08);
    if (s.keys.ArrowRight || s.tilt > 0.35) s.lane = Math.min(LANES - 1, s.lane + 0.08);

    s.enemies.forEach((e) => { e.y += s.speed; });
    s.orbs.forEach((o) => { o.y += s.speed; });
    s.enemies = s.enemies.filter((e) => e.y < H + 40);
    s.orbs = s.orbs.filter((o) => o.y < H + 20);

    s.enemies.forEach((e) => {
      const x = e.lane * laneW + (laneW - e.w) / 2;
      ctx.fillStyle = e.hue;
      ctx.fillRect(x, e.y, e.w, e.h);
    });
    s.orbs.forEach((o) => {
      const cx = o.lane * laneW + laneW / 2;
      ctx.fillStyle = '#00F5FF';
      ctx.beginPath();
      ctx.arc(cx, o.y, o.r, 0, Math.PI * 2);
      ctx.fill();
    });

    const px = s.lane * laneW + laneW / 2;
    const py = H - 90;
    ctx.fillStyle = '#00F5FF';
    ctx.fillRect(px - 15, py, 30, 50);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px - 8, py + 8, 3, 0, Math.PI * 2);
    ctx.arc(px + 8, py + 8, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FF006E';
    ctx.fillRect(px - 10, py + 44, 6, 4);
    ctx.fillRect(px + 4, py + 44, 6, 4);

    for (let i = 0; i < 8; i++) {
      const yy = ((Date.now() / 20 + i * 40) % H);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.moveTo(Math.random() * W, yy);
      ctx.lineTo(Math.random() * W, yy + 12);
      ctx.stroke();
    }

    s.orbs.forEach((o, i) => {
      const cx = o.lane * laneW + laneW / 2;
      if (Math.abs(cx - px) < 22 && Math.abs(o.y - py - 25) < 35) {
        s.score += 50;
        s.orbs.splice(i, 1);
        hapticTap(10);
      }
    });

    s.enemies.forEach((e) => {
      const x = e.lane * laneW + (laneW - e.w) / 2;
      if (e.lane === Math.round(s.lane) && e.y + e.h > py && e.y < py + 50 && Math.abs(x + e.w / 2 - px) < 26) {
        s.over = true;
        setExplode((n) => n + 1);
        hapticTap([40, 60, 40]);
        (async () => {
          try {
            const { data } = await api.post('/games/car-racer/score', { score: Math.floor(s.score) });
            highRef.current = data.highScore ?? highRef.current;
            setUi({ dist: Math.floor(s.dist), score: Math.floor(s.score), speedKmh: Math.floor(80 + s.speed * 12), over: true, high: highRef.current });
            onScoreSaved?.();
          } catch {
            setUi({ dist: Math.floor(s.dist), score: Math.floor(s.score), speedKmh: Math.floor(80 + s.speed * 12), over: true, high: highRef.current });
          }
        })();
      }
    });

    if (!s.over) rafRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    stateRef.current = {
      lane: 1, enemies: [], orbs: [], particles: [], speed: 2.2, dist: 0, score: 0, over: false, keys: {}, tilt: 0, spawnT: 0, speedT: 0,
    };
    setUi((u) => ({ ...u, over: false, dist: 0, score: 0, speedKmh: 80, high: highRef.current }));
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [explode]);

  const shift = (d) => {
    const s = stateRef.current;
    s.lane = Math.max(0, Math.min(LANES - 1, Math.round(s.lane) + d));
    hapticTap(6);
  };

  return (
    <div className="p-3 rounded-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
      <canvas ref={canvasRef} width={W} height={H} className="w-full max-w-[360px] mx-auto rounded-sm touch-none" style={{ background: '#0A0A0F' }} />
      <div className="flex justify-center gap-4 mt-2">
        <button type="button" className="hud-btn px-4 py-2 rounded-sm" style={{ border: '1px solid #252535', color: '#00F5FF' }} onClick={() => shift(-1)}>←</button>
        <button type="button" className="hud-btn px-4 py-2 rounded-sm" style={{ border: '1px solid #252535', color: '#00F5FF' }} onClick={() => shift(1)}>→</button>
      </div>
      {ui.over && (
        <div className="text-center mt-3">
          <p className="font-heading text-lg" style={{ color: '#FF006E' }}>SYSTEMS FAILURE</p>
          <p className="font-mono text-xs" style={{ color: '#6B6B8A' }}>SCORE {ui.score} · BEST {ui.high}</p>
          <ShareScoreButton message={`🏎️ MAX Car Racer: ${ui.score} pts`} />
          <button type="button" className="hud-btn hud-btn-primary w-full py-2 mt-2 rounded-sm text-xs" onClick={() => setExplode((x) => x + 1)}>RESTART</button>
        </div>
      )}
      {onExit && <button type="button" onClick={onExit} className="w-full mt-2 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>EXIT</button>}
    </div>
  );
}
