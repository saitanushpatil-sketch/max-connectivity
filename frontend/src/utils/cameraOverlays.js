export const OVERLAYS = [
  { id: 'none', name: 'OFF', icon: '○' },
  { id: 'jarvis-hud', name: 'HUD', icon: '◈' },
  { id: 'neon-frame', name: 'NEON', icon: '▢' },
  { id: 'star-burst', name: '★', icon: '★' },
  { id: 'retro-tv', name: 'TV', icon: '▣' },
  { id: 'glitch-bars', name: 'GLT', icon: '≡' },
  { id: 'matrix-rain', name: 'MX', icon: '⌗' },
  { id: 'iron-man', name: 'IRON', icon: '◉' },
  { id: 'plain-grid', name: 'GRID', icon: '⊞' },
];

const MATRIX_CHARS = '01アイウエオカキクケコ';

export function drawOverlay(ctx, w, h, overlayId, frame = 0) {
  if (!overlayId || overlayId === 'none') return;
  const t = frame * 0.05;
  ctx.save();

  if (overlayId === 'jarvis-hud') {
    ctx.strokeStyle = 'rgba(0,245,255,0.5)';
    ctx.lineWidth = 1;
    const pad = 24;
    ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
    [[pad, pad], [w - pad, pad], [pad, h - pad], [w - pad, h - pad]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (x < w / 2 ? 20 : -20), y);
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + (y < h / 2 ? 20 : -20));
      ctx.stroke();
    });
    ctx.fillStyle = 'rgba(0,245,255,0.8)';
    ctx.font = '11px monospace';
    ctx.fillText('SCANNING...', pad + 8, pad + 20);
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.35, 30 + Math.sin(t) * 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (overlayId === 'neon-frame') {
    const pulse = 0.5 + Math.sin(t * 2) * 0.5;
    ctx.strokeStyle = `rgba(0,245,255,${0.4 + pulse * 0.4})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00F5FF';
    ctx.shadowBlur = 12;
    ctx.strokeRect(w * 0.15, h * 0.2, w * 0.7, h * 0.45);
    ctx.shadowBlur = 0;
  }

  if (overlayId === 'star-burst') {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + t;
      const r = 8 + (i % 3) * 4;
      const x = w / 2 + Math.cos(a) * (w * 0.42);
      const y = h * 0.3 + Math.sin(a) * (h * 0.2);
      ctx.fillStyle = `rgba(255,255,255,${0.3 + (i % 2) * 0.4})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (overlayId === 'retro-tv') {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 2);
    ctx.fillStyle = '#FF006E';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('● LIVE', 16, 28);
  }

  if (overlayId === 'glitch-bars') {
    for (let i = 0; i < 5; i++) {
      if (Math.random() > 0.7) {
        const y = Math.random() * h;
        ctx.fillStyle = `rgba(0,245,255,${Math.random() * 0.3})`;
        ctx.fillRect(0, y, w, 2 + Math.random() * 8);
      }
    }
  }

  if (overlayId === 'matrix-rain') {
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(6,214,160,0.6)';
    for (let col = 0; col < 8; col++) {
      const x = col < 4 ? col * 14 + 4 : w - (col - 3) * 14 - 20;
      for (let row = 0; row < 12; row++) {
        const ch = MATRIX_CHARS[Math.floor((frame + col + row) % MATRIX_CHARS.length)];
        ctx.fillText(ch, x, ((frame * 3 + row * 18 + col * 40) % h));
      }
    }
  }

  if (overlayId === 'iron-man') {
    const pad = 30;
    ctx.strokeStyle = 'rgba(255,183,3,0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
    ctx.fillStyle = '#FF006E';
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.38, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,183,3,0.9)';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('MARK L', w / 2 - 24, pad + 16);
  }

  if (overlayId === 'plain-grid') {
    ctx.strokeStyle = 'rgba(0,245,255,0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  ctx.restore();
}
