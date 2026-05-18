import { useRef, useEffect, useState, useCallback } from 'react';
import api from '../../utils/api';
import ShareScoreButton from './ShareScoreButton';
import hapticTap from '../../utils/haptic';

const W = 360;
const H = 520;

export default function SpaceShooter({ onExit, onScoreSaved }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const sRef = useRef({
    px: W / 2,
    bullets: [],
    enemies: [],
    particles: [],
    stars: Array.from({ length: 100 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 1 + Math.random() * 2 })),
    wave: 1,
    score: 0,
    lives: 3,
    over: false,
    fireCd: 0,
    shieldT: 0,
    rapidT: 0,
    boss: null,
    waveMsgT: 0,
    spawnAcc: 0,
    dragging: false,
  });
  const [ui, setUi] = useState({ score: 0, wave: 1, lives: 3, over: false, high: 0 });
  const highRef = useRef(0);
  const [boot, setBoot] = useState(0);

  const loadHigh = useCallback(async () => {
    try {
      const { data } = await api.get('/games/stats');
      highRef.current = data.stats?.spaceShooterHighScore || 0;
      setUi((u) => ({ ...u, high: highRef.current }));
    } catch { /* */ }
  }, []);
  useEffect(() => { loadHigh(); }, [loadHigh]);

  const endGame = async (s) => {
    if (s.overSent) return;
    s.overSent = true;
    try {
      const { data } = await api.post('/games/space-shooter/score', { score: Math.floor(s.score) });
      highRef.current = data.highScore ?? highRef.current;
      setUi({ score: Math.floor(s.score), wave: s.wave, lives: 0, over: true, high: highRef.current });
      onScoreSaved?.();
    } catch {
      setUi({ score: Math.floor(s.score), wave: s.wave, lives: 0, over: true, high: highRef.current });
    }
  };

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return undefined;
    const ctx = c.getContext('2d');
    const s = sRef.current;
    s.over = false;
    s.overSent = false;
    s.score = 0;
    s.wave = 1;
    s.lives = 3;
    s.bullets = [];
    s.enemies = [];
    s.boss = null;
    s.waveMsgT = 90;
    const shipY = H - 56;
    const fire = () => {
      if (s.over || s.fireCd > 0) return;
      s.fireCd = s.rapidT > 0 ? 4 : 10;
      s.bullets.push({ x: s.px, y: shipY - 10, vy: s.rapidT > 0 ? 10 : 7 });
    };

    const loop = () => {
      if (s.over) return;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      s.stars.forEach((st) => {
        st.y = (st.y + st.s * 0.6) % H;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(st.x, st.y, 2, 2);
      });

      if (s.waveMsgT > 0) {
        s.waveMsgT -= 1;
        ctx.fillStyle = '#00F5FF';
        ctx.font = 'bold 22px Rajdhani,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`WAVE ${s.wave}`, W / 2, 80);
        ctx.font = '12px monospace';
        ctx.fillStyle = '#6B6B8A';
        ctx.fillText('TAP / HOLD TO FIRE · DRAG TO MOVE', W / 2, 110);
      }

      if (s.fireCd > 0) s.fireCd -= 1;
      if (s.rapidT > 0) s.rapidT -= 1;
      if (s.shieldT > 0) s.shieldT -= 1;

      s.bullets.forEach((b) => { b.y -= b.vy; });
      s.bullets = s.bullets.filter((b) => b.y > -10);

      s.spawnAcc += 1;
      const rate = Math.max(18, 40 - s.wave * 2);
      if (!s.boss && s.spawnAcc > rate) {
        s.spawnAcc = 0;
        const t = Math.floor(Math.random() * 3);
        const x = 40 + Math.random() * (W - 80);
        s.enemies.push({ x, y: -20, t, vx: t === 1 ? 1.2 : 0, phase: Math.random() * 6, hp: t === 2 ? 2 : 1 });
      }

      if (s.wave % 5 === 0 && !s.boss && s.enemies.length === 0 && s.spawnAcc > 120) {
        s.boss = { x: W / 2, y: 60, hp: 10, cd: 0 };
      }

      s.enemies.forEach((e) => {
        e.y += 1.2 + s.wave * 0.08;
        if (e.t === 1) e.x += Math.sin(s.spawnAcc * 0.05 + e.phase) * 2;
        if (e.t === 2) e.x += (e.x < W / 2 ? 1.5 : -1.5);
      });
      s.enemies = s.enemies.filter((e) => e.y < H + 30);

      if (s.boss) {
        s.boss.x += Math.sin(Date.now() / 300) * 2.5;
        s.boss.cd -= 1;
        if (s.boss.cd <= 0) {
          s.boss.cd = 55;
          [-20, 0, 20].forEach((ox) => s.enemies.push({ x: s.boss.x + ox, y: s.boss.y + 40, t: 2, vx: 0, phase: 0, hp: 1, bullet: true }));
        }
      }

      ctx.fillStyle = '#00F5FF';
      s.bullets.forEach((b) => { ctx.fillRect(b.x - 2, b.y, 4, 12); });

      s.enemies.forEach((e) => {
        ctx.beginPath();
        if (e.t === 0) {
          ctx.fillStyle = '#FF006E';
          ctx.moveTo(e.x, e.y - 10); ctx.lineTo(e.x + 12, e.y + 10); ctx.lineTo(e.x - 12, e.y + 10);
        } else if (e.t === 1) {
          ctx.fillStyle = '#FFB703';
          ctx.arc(e.x, e.y, 12, 0, Math.PI * 2);
        } else {
          ctx.fillStyle = e.bullet ? '#FF006E' : '#F97316';
          ctx.moveTo(e.x, e.y - 12); ctx.lineTo(e.x + 10, e.y + 8); ctx.lineTo(e.x - 10, e.y + 8);
        }
        ctx.fill();
      });

      if (s.boss) {
        ctx.fillStyle = '#8B5CF6';
        ctx.fillRect(s.boss.x - 40, s.boss.y - 20, 80, 36);
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.fillText(`BOSS ${s.boss.hp}`, s.boss.x - 20, s.boss.y);
      }

      ctx.fillStyle = '#00F5FF';
      ctx.beginPath();
      ctx.moveTo(s.px, shipY - 16);
      ctx.lineTo(s.px + 18, shipY + 14);
      ctx.lineTo(s.px - 18, shipY + 14);
      ctx.fill();
      if (s.shieldT > 0) {
        ctx.strokeStyle = 'rgba(0,245,255,0.5)';
        ctx.beginPath();
        ctx.arc(s.px, shipY, 28, 0, Math.PI * 2);
        ctx.stroke();
      }

      s.bullets.forEach((b) => {
        if (s.boss && b.x > s.boss.x - 42 && b.x < s.boss.x + 42 && b.y < s.boss.y + 24 && b.y > s.boss.y - 24) {
          s.boss.hp -= 1;
          b.y = -999;
          if (s.boss.hp <= 0) {
            s.score += 500;
            s.boss = null;
            s.wave += 1;
            s.waveMsgT = 80;
            hapticTap(20);
          }
        }
        s.enemies.forEach((e) => {
          if (e.hp <= 0) return;
          if (Math.abs(b.x - e.x) < 16 && Math.abs(b.y - e.y) < 16) {
            e.hp -= 1;
            b.y = -999;
            if (e.hp <= 0) {
              s.score += e.t === 0 ? 10 : e.t === 1 ? 20 : 30;
              e.y = 9999;
            }
          }
        });
      });

      s.enemies.forEach((e) => {
        if (e.y > H - 50 && Math.abs(e.x - s.px) < 22) {
          if (s.shieldT <= 0) {
            s.lives -= 1;
            e.y = 9999;
            hapticTap([30, 50, 30]);
            if (s.lives <= 0) {
              s.over = true;
              endGame(s);
            }
          } else e.y = 9999;
        }
      });

      ctx.fillStyle = '#00F5FF';
      for (let i = 0; i < s.lives; i += 1) {
        ctx.beginPath();
        ctx.moveTo(18 + i * 22, 22);
        ctx.lineTo(26 + i * 22, 34);
        ctx.lineTo(10 + i * 22, 34);
        ctx.fill();
      }
      ctx.textAlign = 'left';
      ctx.font = '12px monospace';
      ctx.fillStyle = '#E8E8FF';
      ctx.fillText(`SCORE ${Math.floor(s.score)}`, 90, 28);
      ctx.fillText(`WAVE ${s.wave}`, 200, 28);

      if (!s.over) rafRef.current = requestAnimationFrame(loop);
    };

    const onDown = (e) => { s.dragging = true; fire(); };
    const onUp = () => { s.dragging = false; };
    const onMove = (e) => {
      const r = c.getBoundingClientRect();
      const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      s.px = Math.max(24, Math.min(W - 24, (cx / r.width) * W));
    };
    const onHold = setInterval(() => { if (s.dragging) fire(); }, 120);

    c.addEventListener('mousedown', onDown);
    c.addEventListener('mouseup', onUp);
    c.addEventListener('mousemove', onMove);
    c.addEventListener('touchstart', onDown, { passive: true });
    c.addEventListener('touchend', onUp);
    c.addEventListener('touchmove', onMove, { passive: true });

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      clearInterval(onHold);
      c.removeEventListener('mousedown', onDown);
      c.removeEventListener('mouseup', onUp);
      c.removeEventListener('mousemove', onMove);
      c.removeEventListener('touchstart', onDown);
      c.removeEventListener('touchend', onUp);
      c.removeEventListener('touchmove', onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [boot]);

  return (
    <div className="p-3 rounded-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
      <p className="font-mono text-[10px] mb-2" style={{ color: '#6B6B8A' }}>// SPACE SHOOTER</p>
      <canvas ref={canvasRef} width={W} height={H} className="w-full max-w-[360px] mx-auto rounded-sm touch-none" />
      {ui.over && (
        <div className="text-center mt-3">
          <p className="font-heading text-lg" style={{ color: '#FF006E' }}>JARVIS: All systems offline</p>
          <p className="font-mono text-xs" style={{ color: '#6B6B8A' }}>SCORE {ui.score} · WAVE {ui.wave} · BEST {ui.high}</p>
          <ShareScoreButton message={`🚀 MAX Space Shooter: ${ui.score} pts (wave ${ui.wave})`} />
          <button type="button" className="hud-btn hud-btn-primary w-full py-2 mt-2 rounded-sm text-xs" onClick={() => setBoot((b) => b + 1)}>RESTART</button>
        </div>
      )}
      {onExit && <button type="button" onClick={onExit} className="w-full mt-2 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>EXIT</button>}
    </div>
  );
}
