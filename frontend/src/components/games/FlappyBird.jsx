import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import ShareScoreButton from './ShareScoreButton';
import hapticTap from '../../utils/haptic';

const W = 320;
const H = 480;
const GRAVITY = 0.45;
const FLAP = -7.5;
const PIPE_W = 52;
const GAP = 120;
const PIPE_SPEED = 2.2;

function drawHex(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const px = x + r * Math.cos(a);
    const py = y + r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export default function FlappyBird({ onExit, onScoreSaved }) {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [high, setHigh] = useState(0);
  const [over, setOver] = useState(false);
  const [started, setStarted] = useState(false);

  const stateRef = useRef({
    bird: { y: H / 2, vy: 0 },
    pipes: [],
    frame: 0,
    score: 0,
    running: false,
  });

  const loadHigh = useCallback(async () => {
    try {
      const { data } = await api.get('/games/stats');
      setHigh(data.stats?.flappyHighScore || 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadHigh();
  }, [loadHigh]);

  const endGame = useCallback(async (final) => {
    stateRef.current.running = false;
    setOver(true);
    setStarted(false);
    hapticTap([25, 50, 25]);
    try {
      const { data } = await api.post('/games/flappy/score', { score: final });
      setHigh(data.highScore ?? final);
      onScoreSaved?.();
    } catch {
      setHigh((h) => Math.max(h, final));
    }
  }, [onScoreSaved]);

  const flap = useCallback(() => {
    if (!stateRef.current.running) {
      stateRef.current.running = true;
      stateRef.current.bird = { y: H / 2, vy: 0 };
      stateRef.current.pipes = [];
      stateRef.current.score = 0;
      stateRef.current.frame = 0;
      setScore(0);
      setOver(false);
      setStarted(true);
    }
    stateRef.current.bird.vy = FLAP;
    hapticTap(6);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let raf;

    const loop = () => {
      const st = stateRef.current;
      ctx.fillStyle = '#0A0A0F';
      ctx.fillRect(0, 0, W, H);

      if (st.running) {
        st.bird.vy += GRAVITY;
        st.bird.y += st.bird.vy;
        st.frame += 1;

        if (st.frame % 90 === 0) {
          const gapY = 80 + Math.random() * (H - GAP - 160);
          st.pipes.push({ x: W, gapY });
        }

        st.pipes.forEach((p) => {
          p.x -= PIPE_SPEED;
        });
        st.pipes = st.pipes.filter((p) => p.x > -PIPE_W);

        st.pipes.forEach((p) => {
          if (p.x + PIPE_W < W / 2 - 20 && !p.passed) {
            p.passed = true;
            st.score += 1;
            setScore(st.score);
          }
        });

        const bx = W / 2 - 16;
        const by = st.bird.y;
        const hitPipe = st.pipes.some((p) => {
          const inX = bx + 14 > p.x && bx - 14 < p.x + PIPE_W;
          const hitTop = by - 14 < p.gapY;
          const hitBot = by + 14 > p.gapY + GAP;
          return inX && (hitTop || hitBot);
        });

        if (by < 0 || by > H || hitPipe) {
          endGame(st.score);
        }
      }

      st.pipes.forEach((p) => {
        ctx.fillStyle = '#00F5FF';
        ctx.fillRect(p.x, 0, PIPE_W, p.gapY);
        ctx.fillStyle = '#FF006E';
        ctx.fillRect(p.x, p.gapY + GAP, PIPE_W, H - p.gapY - GAP);
      });

      ctx.fillStyle = '#00F5FF';
      drawHex(ctx, W / 2, st.bird.y, 16);
      ctx.fill();

      ctx.fillStyle = '#E8E8FF';
      ctx.font = 'bold 28px monospace';
      ctx.fillText(String(st.score), W / 2 - 8, 40);

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [endGame]);

  return (
    <div className="p-4 rounded-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
      <div className="flex justify-between mb-2 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>
        <span>SCORE <span style={{ color: '#00F5FF' }}>{score}</span></span>
        <span>BEST <span style={{ color: '#06D6A0' }}>{high}</span></span>
      </div>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="mx-auto rounded-sm cursor-pointer touch-none block"
        style={{ border: '1px solid #252535', maxWidth: '100%' }}
        onClick={flap}
        onTouchStart={(e) => { e.preventDefault(); flap(); }}
      />

      {!started && !over && (
        <p className="text-center font-mono text-[10px] mt-2" style={{ color: '#6B6B8A' }}>TAP OR SPACE TO FLAP</p>
      )}
      {over && (
        <>
          <ShareScoreButton message={`🐦 MAX Flappy: ${score} pipes`} />
          <button type="button" onClick={flap} className="hud-btn hud-btn-ghost w-full py-2 text-xs mt-2">RETRY</button>
        </>
      )}
      {onExit && <button type="button" onClick={onExit} className="w-full mt-2 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>EXIT</button>}
    </div>
  );
}
