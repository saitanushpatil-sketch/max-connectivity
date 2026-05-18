import { useRef, useEffect, useState, useCallback } from 'react';
import api from '../../utils/api';
import hapticTap from '../../utils/haptic';

const W = 360;
const H = 560;
const ROAD_W = W * 0.62;
const ROAD_X = (W - ROAD_W) / 2;
const LANES = 3;
const LANE_W = ROAD_W / LANES;
const PLAYER_W = 50;
const PLAYER_H = 80;
const PLAYER_Y = H - 120;

// ─── Drawing helpers ──────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawPlayerCar(ctx, x, y, invincible, frame) {
  // Speed lines behind car
  const numLines = 6;
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i < numLines; i++) {
    const lx = x - PLAYER_W / 2 + (i / numLines) * PLAYER_W;
    ctx.beginPath();
    ctx.moveTo(lx, y + PLAYER_H + 3);
    ctx.lineTo(lx, y + PLAYER_H + 12 + Math.random() * 8);
    ctx.stroke();
  }

  // Body
  if (invincible && Math.floor(frame / 4) % 2 === 0) {
    ctx.globalAlpha = 0.5;
  }
  ctx.shadowColor = '#00F5FF';
  ctx.shadowBlur = 14;
  roundRect(ctx, x - PLAYER_W / 2, y, PLAYER_W, PLAYER_H, 8);
  ctx.fillStyle = '#00D4E8';
  ctx.fill();
  ctx.strokeStyle = '#00F5FF';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Windshield
  roundRect(ctx, x - PLAYER_W / 2 + 6, y + 8, PLAYER_W - 12, PLAYER_H * 0.35, 5);
  ctx.fillStyle = 'rgba(0,20,40,0.85)';
  ctx.fill();

  // Headlights
  ctx.fillStyle = '#fffbe0';
  ctx.shadowColor = '#fff';
  ctx.shadowBlur = 8;
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.arc(x + side * (PLAYER_W / 2 - 6), y + 10, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Tail lights
  ctx.fillStyle = '#FF3333';
  ctx.shadowColor = '#FF0000';
  ctx.shadowBlur = 8;
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.arc(x + side * (PLAYER_W / 2 - 6), y + PLAYER_H - 8, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.shadowBlur = 0;

  // Wheels
  ctx.fillStyle = '#0A0A10';
  [-1, 1].forEach((side) => {
    ctx.fillRect(x + side * (PLAYER_W / 2) - (side > 0 ? 0 : 10), y + 12, 10, 22);
    ctx.fillRect(x + side * (PLAYER_W / 2) - (side > 0 ? 0 : 10), y + PLAYER_H - 30, 10, 22);
  });
  ctx.globalAlpha = 1;
}

// Enemy types: truck, sports, suv, police
function drawEnemyCar(ctx, enemy, frame) {
  const { x, y, type } = enemy;
  const ew = enemy.w;
  const eh = enemy.h;

  switch (type) {
    case 'truck':
      ctx.shadowColor = '#FF4444'; ctx.shadowBlur = 8;
      roundRect(ctx, x - ew / 2, y, ew, eh, 5);
      ctx.fillStyle = '#CC3333'; ctx.fill();
      ctx.strokeStyle = '#888'; ctx.lineWidth = 1; ctx.stroke();
      roundRect(ctx, x - ew / 2 + 4, y + 4, ew - 8, eh * 0.3, 3);
      ctx.fillStyle = '#555'; ctx.fill();
      break;
    case 'sports':
      ctx.shadowColor = '#FF006E'; ctx.shadowBlur = 10;
      roundRect(ctx, x - ew / 2, y + eh * 0.2, ew, eh * 0.8, 6);
      ctx.fillStyle = '#CC0055'; ctx.fill();
      ctx.strokeStyle = '#FF006E'; ctx.lineWidth = 1.5; ctx.stroke();
      roundRect(ctx, x - ew / 2 + 5, y, ew - 10, eh * 0.55, 8);
      ctx.fillStyle = '#CC0055'; ctx.fill();
      ctx.strokeStyle = '#FF006E'; ctx.stroke();
      break;
    case 'suv':
      ctx.shadowColor = '#FFB703'; ctx.shadowBlur = 8;
      roundRect(ctx, x - ew / 2, y, ew, eh, 4);
      ctx.fillStyle = '#CC8800'; ctx.fill();
      ctx.strokeStyle = '#FFB703'; ctx.lineWidth = 1.5; ctx.stroke();
      roundRect(ctx, x - ew / 2 + 4, y + 5, ew - 8, eh * 0.55, 3);
      ctx.fillStyle = 'rgba(0,20,40,0.7)'; ctx.fill();
      break;
    case 'police': {
      ctx.shadowColor = '#fff'; ctx.shadowBlur = 6;
      roundRect(ctx, x - ew / 2, y, ew, eh, 5);
      ctx.fillStyle = '#E0E0E0'; ctx.fill();
      ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1; ctx.stroke();
      // Police stripe
      ctx.fillStyle = '#1A1A2E';
      ctx.fillRect(x - ew / 2 + 3, y + eh * 0.35, ew - 6, eh * 0.15);
      // Flashing lights
      const flashPhase = Math.floor(frame / 8) % 2;
      ctx.fillStyle = flashPhase === 0 ? '#FF0000' : '#0000FF';
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(x - 8, y + 6, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flashPhase === 0 ? '#0000FF' : '#FF0000';
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(x + 8, y + 6, 5, 0, Math.PI * 2); ctx.fill();
      break;
    }
    default:
      ctx.fillStyle = '#FF006E';
      ctx.fillRect(x - ew / 2, y, ew, eh);
  }
  ctx.shadowBlur = 0;
}

function drawDiamond(ctx, x, y, size, frame) {
  const bob = Math.sin(frame * 0.1) * 3;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.rotate(Math.PI / 4);
  ctx.shadowColor = '#00F5FF'; ctx.shadowBlur = 12;
  ctx.fillStyle = '#00F5FF';
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.restore();
  ctx.shadowBlur = 0;
}

function drawStar(ctx, x, y, size, frame) {
  const bob = Math.sin(frame * 0.1 + 1) * 3;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 14;
  ctx.fillStyle = '#FFD700';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const x2 = Math.cos(a) * size;
    const y2 = Math.sin(a) * size;
    i === 0 ? ctx.moveTo(x2, y2) : ctx.lineTo(x2, y2);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.shadowBlur = 0;
}

const ENEMY_TYPES = ['truck', 'sports', 'suv', 'police'];
const ENEMY_SIZES = {
  truck:  { w: LANE_W * 0.72, h: 72 },
  sports: { w: LANE_W * 0.45, h: 64 },
  suv:    { w: LANE_W * 0.60, h: 70 },
  police: { w: LANE_W * 0.58, h: 66 },
};

function laneCenter(lane) {
  return ROAD_X + lane * LANE_W + LANE_W / 2;
}

export default function CarRacer({ onExit, onScoreSaved }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const stateRef = useRef(null);
  const [ui, setUi] = useState({ dist: 0, score: 0, speedKmh: 80, over: false, high: 0 });
  const highRef = useRef(0);
  const [boot, setBoot] = useState(0);

  const loadHigh = useCallback(async () => {
    try {
      const { data } = await api.get('/games/stats');
      highRef.current = data.stats?.carRacerHighScore || 0;
      setUi((u) => ({ ...u, high: highRef.current }));
    } catch { /* */ }
  }, []);
  useEffect(() => { loadHigh(); }, [loadHigh]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const s = {
      playerX: W / 2,
      targetX: W / 2,
      enemies: [],
      collectibles: [],
      particles: [],
      dashOffset: 0,
      speed: 2.5,
      dist: 0,
      score: 0,
      over: false,
      keys: {},
      tilt: 0,
      spawnT: 0,
      speedT: 0,
      frame: 0,
      invincibleT: 0,
      slowmoT: 0,
      flashT: 0,
    };
    stateRef.current = s;

    // Key handlers
    const onKey = (e) => { s.keys[e.code] = e.type === 'keydown'; };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    const onTilt = (e) => { if (e.gamma != null) s.tilt = Math.max(-1, Math.min(1, e.gamma / 25)); };
    window.addEventListener('deviceorientation', onTilt, true);

    const loop = () => {
      if (s.over) return;
      const speedMult = s.slowmoT > 0 ? 0.3 : 1;
      const effectiveSpeed = s.speed * speedMult;

      s.frame++;
      s.dist += effectiveSpeed * 0.25;
      s.score += effectiveSpeed * 0.12;
      s.spawnT++;
      s.speedT++;
      if (s.flashT > 0) s.flashT--;
      if (s.invincibleT > 0) s.invincibleT--;
      if (s.slowmoT > 0) s.slowmoT--;

      // Speed up
      if (s.speedT > 500) { s.speedT = 0; s.speed = Math.min(s.speed + 0.1, 8); }

      // Spawn
      const spawnRate = Math.max(25, 65 - s.speed * 4);
      if (s.spawnT > spawnRate) {
        s.spawnT = 0;
        const lane = Math.floor(Math.random() * LANES);
        const type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
        const sz = ENEMY_SIZES[type];
        const speed = type === 'truck' ? 0.5 : type === 'sports' ? 1.4 : type === 'police' ? 0.9 : 1.0;
        s.enemies.push({ lane, x: laneCenter(lane), y: -80, w: sz.w, h: sz.h, type, speed });
        if (Math.random() > 0.6) {
          const cl = Math.floor(Math.random() * LANES);
          const ctype = Math.random() > 0.5 ? 'diamond' : 'star';
          s.collectibles.push({ x: laneCenter(cl), y: -40, type: ctype });
        }
      }

      // Move
      const leftPress = s.keys.ArrowLeft || s.keys.KeyA || s.tilt < -0.3;
      const rightPress = s.keys.ArrowRight || s.keys.KeyD || s.tilt > 0.3;
      if (leftPress) s.targetX = Math.max(ROAD_X + PLAYER_W / 2 + 5, s.targetX - 4);
      if (rightPress) s.targetX = Math.min(ROAD_X + ROAD_W - PLAYER_W / 2 - 5, s.targetX + 4);
      s.playerX += (s.targetX - s.playerX) * 0.18;

      s.enemies.forEach((e) => { e.y += effectiveSpeed * e.speed; });
      s.collectibles.forEach((c) => { c.y += effectiveSpeed; });
      s.enemies = s.enemies.filter((e) => e.y < H + 100);
      s.collectibles = s.collectibles.filter((c) => c.y < H + 50);
      s.dashOffset = (s.dashOffset + effectiveSpeed * 0.5) % 28;

      // ── Draw ──────────────────────────────────────────────────

      // Grass sides
      ctx.fillStyle = '#0A1A0A';
      ctx.fillRect(0, 0, ROAD_X, H);
      ctx.fillRect(ROAD_X + ROAD_W, 0, W - ROAD_X - ROAD_W, H);

      // Road
      ctx.fillStyle = '#1A1A26';
      ctx.fillRect(ROAD_X, 0, ROAD_W, H);

      // Road edge lines
      ctx.strokeStyle = '#252535';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(ROAD_X, 0); ctx.lineTo(ROAD_X, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ROAD_X + ROAD_W, 0); ctx.lineTo(ROAD_X + ROAD_W, H); ctx.stroke();

      // Center dashes
      ctx.strokeStyle = 'rgba(0,245,255,0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([14, 14]);
      ctx.lineDashOffset = -s.dashOffset;
      for (let lane = 1; lane < LANES; lane++) {
        const lx = ROAD_X + lane * LANE_W;
        ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, H); ctx.stroke();
      }
      ctx.setLineDash([]);

      // Collectibles
      s.collectibles.forEach((c) => {
        if (c.type === 'diamond') drawDiamond(ctx, c.x, c.y, 12, s.frame);
        else drawStar(ctx, c.x, c.y, 12, s.frame);
      });

      // Enemy cars
      s.enemies.forEach((e) => { e.x = laneCenter(e.lane); drawEnemyCar(ctx, e, s.frame); });

      // Player car
      drawPlayerCar(ctx, s.playerX, PLAYER_Y, s.invincibleT > 0, s.frame);

      // Flash overlay
      if (s.flashT > 0) {
        ctx.fillStyle = `rgba(255,0,0,${s.flashT / 10 * 0.4})`;
        ctx.fillRect(0, 0, W, H);
      }

      // Particles
      s.particles = s.particles.filter((p) => p.life > 0);
      s.particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.life--;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      });
      ctx.globalAlpha = 1;

      // ── HUD ───────────────────────────────────────────────────
      const speedKmh = Math.floor(80 + s.speed * 18);
      // Top overlay
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, 46);

      // Speedometer arc
      const arcCx = 42; const arcCy = 32; const arcR = 24;
      const speedFrac = Math.min(1, (s.speed - 2) / 8);
      ctx.strokeStyle = '#252535'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(arcCx, arcCy, arcR, Math.PI * 0.75, Math.PI * 2.25); ctx.stroke();
      ctx.strokeStyle = `hsl(${180 - speedFrac * 180},100%,55%)`;
      ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(arcCx, arcCy, arcR, Math.PI * 0.75, Math.PI * 0.75 + speedFrac * Math.PI * 1.5); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#E8E8FF'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`${speedKmh}`, arcCx, arcCy + 3);
      ctx.fillStyle = '#6B6B8A'; ctx.font = '8px monospace';
      ctx.fillText('km/h', arcCx, arcCy + 14);

      ctx.fillStyle = '#FFB703'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`${Math.floor(s.dist)}m`, W / 2, 28);

      ctx.fillStyle = '#00F5FF'; ctx.font = 'bold 14px Rajdhani,sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(Math.floor(s.score), W - 10, 30);
      ctx.fillStyle = '#6B6B8A'; ctx.font = '9px monospace';
      ctx.fillText('SCORE', W - 10, 42);

      // ── Collision detection ──────────────────────────────────
      s.collectibles.forEach((c, i) => {
        if (Math.abs(c.x - s.playerX) < 28 && Math.abs(c.y - PLAYER_Y - 20) < 40) {
          const pts = c.type === 'star' ? 100 : 50;
          s.score += pts;
          if (c.type === 'star') s.invincibleT = 120;
          s.collectibles.splice(i, 1);
          hapticTap(10);
        }
      });

      s.enemies.forEach((e) => {
        if (s.invincibleT > 0) return;
        if (Math.abs(e.x - s.playerX) < (PLAYER_W / 2 + e.w / 2 - 8) && e.y + e.h > PLAYER_Y && e.y < PLAYER_Y + PLAYER_H) {
          // Collision!
          s.over = true;
          s.flashT = 10;
          hapticTap([40, 60, 40]);
          // Spawn explosion particles
          for (let p = 0; p < 20; p++) {
            const angle = Math.random() * Math.PI * 2;
            const speed2 = 2 + Math.random() * 5;
            s.particles.push({ x: s.playerX, y: PLAYER_Y + PLAYER_H / 2, vx: Math.cos(angle) * speed2, vy: Math.sin(angle) * speed2, r: 4 + Math.random() * 6, color: ['#FF006E', '#FFB703', '#00F5FF'][Math.floor(Math.random() * 3)], life: 40, maxLife: 40 });
          }
          setTimeout(async () => {
            try {
              const { data } = await api.post('/games/car-racer/score', { score: Math.floor(s.score) });
              highRef.current = data.highScore ?? highRef.current;
              onScoreSaved?.();
            } catch { /* */ }
            setUi({ dist: Math.floor(s.dist), score: Math.floor(s.score), speedKmh, over: true, high: highRef.current });
          }, 800);
        }
      });

      if (!s.over) rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('deviceorientation', onTilt, true);
    };
  }, [boot, loadHigh, onScoreSaved]);

  const mobileShift = (dir) => {
    const s = stateRef.current;
    if (!s || s.over) return;
    s.targetX = Math.max(ROAD_X + PLAYER_W / 2 + 5, Math.min(ROAD_X + ROAD_W - PLAYER_W / 2 - 5, s.targetX + dir * LANE_W));
    hapticTap(6);
  };

  return (
    <div className="flex flex-col items-center gap-3 p-3">
      <canvas ref={canvasRef} width={W} height={H} className="rounded-xl touch-none" style={{ maxWidth: '100%', background: '#0A0A0F', border: '1px solid #252535' }} />

      {/* Mobile controls */}
      {!ui.over && (
        <div className="flex gap-4 w-full max-w-[360px]">
          <button type="button" onClick={() => mobileShift(-1)} className="flex-1 py-5 rounded-xl text-2xl" style={{ background: '#12121A', border: '1px solid #252535', color: '#00F5FF', fontSize: 28, fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.4)', touchAction: 'manipulation' }}>◀</button>
          <button type="button" onClick={() => mobileShift(1)} className="flex-1 py-5 rounded-xl text-2xl" style={{ background: '#12121A', border: '1px solid #252535', color: '#00F5FF', fontSize: 28, fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.4)', touchAction: 'manipulation' }}>▶</button>
        </div>
      )}

      {/* Game over */}
      {ui.over && (
        <div className="w-full max-w-[360px] rounded-xl p-5 text-center" style={{ background: 'rgba(255,0,110,0.08)', border: '2px solid rgba(255,0,110,0.3)' }}>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 900, fontSize: 28, color: '#FF006E', letterSpacing: 4, textShadow: '0 0 20px rgba(255,0,110,0.5)' }}>COLLISION DETECTED</div>
          <div className="grid grid-cols-3 gap-2 mt-4 mb-5">
            {[
              { label: 'DISTANCE', value: `${ui.dist}m`, color: '#FFB703' },
              { label: 'SCORE', value: ui.score, color: '#00F5FF' },
              { label: 'BEST', value: ui.high, color: '#06D6A0' },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-2 rounded-lg" style={{ background: '#12121A', border: '1px solid #252535' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#6B6B8A', letterSpacing: 1 }}>{label}</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 20, color }}>{value}</div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => { setUi((u) => ({ ...u, over: false })); setBoot((b) => b + 1); }} style={{ width: '100%', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 16, letterSpacing: 3, color: '#0A0A0F', background: '#00F5FF', borderRadius: 10, padding: '14px 0', boxShadow: '0 0 20px rgba(0,245,255,0.3)' }}>
            RESTART
          </button>
        </div>
      )}

      {onExit && <button type="button" onClick={onExit} style={{ fontFamily: 'monospace', fontSize: 10, color: '#6B6B8A', letterSpacing: 2 }}>EXIT</button>}
    </div>
  );
}
