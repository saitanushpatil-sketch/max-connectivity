/**
 * Camera AR Overlays — Canvas 2D drawings positioned on frame
 * All overlays use center-screen positioning (no face detection needed)
 */

export const OVERLAYS = [
  { id: 'none',       name: 'OFF',      icon: '○' },
  { id: 'iron-man',   name: 'IRON MAN', icon: '🤖' },
  { id: 'alien-eyes', name: 'ALIEN',    icon: '👽' },
  { id: 'crown',      name: 'CROWN',    icon: '👑' },
  { id: 'neon-shades',name: 'SHADES',   icon: '👓' },
  { id: 'halo-horns', name: 'HALO',     icon: '😇' },
  { id: 'bunny-ears', name: 'BUNNY',    icon: '🐰' },
  { id: 'glitch-face',name: 'GLITCH',   icon: '💀' },
  { id: 'star-lord',  name: 'STARLORD', icon: '🚀' },
];

const MATRIX_CHARS = '01アイウエオカキクケコサシスセソ';

/** Main overlay dispatcher */
export function drawOverlay(ctx, w, h, overlayId, frame = 0) {
  if (!overlayId || overlayId === 'none') return;
  ctx.save();
  switch (overlayId) {
    case 'iron-man':   drawIronMan(ctx, w, h, frame);   break;
    case 'alien-eyes': drawAlienEyes(ctx, w, h, frame); break;
    case 'crown':      drawCrown(ctx, w, h, frame);     break;
    case 'neon-shades':drawNeonShades(ctx, w, h, frame);break;
    case 'halo-horns': drawHaloHorns(ctx, w, h, frame); break;
    case 'bunny-ears': drawBunnyEars(ctx, w, h, frame); break;
    case 'glitch-face':drawGlitchFace(ctx, w, h, frame);break;
    case 'star-lord':  drawStarLord(ctx, w, h, frame);  break;
    default: break;
  }
  ctx.restore();
}

// ─── IRON MAN MASK ────────────────────────────────────────────────
function drawIronMan(ctx, w, h, frame) {
  const cx = w / 2;
  const cy = h * 0.45;
  const size = Math.min(w, h) * 0.28;
  const pulse = Math.sin(frame * 0.1) * 0.15 + 0.85;

  // Face outline (red hexagonal mask)
  ctx.beginPath();
  ctx.ellipse(cx, cy, size * 0.65, size * 0.85, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(180,0,0,0.55)';
  ctx.fill();

  // Gold border
  ctx.strokeStyle = '#FFB703';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Eye slots (cyan glow)
  const eyeY = cy - size * 0.18;
  [-1, 1].forEach((side) => {
    const ex = cx + side * size * 0.28;
    // Eye glow
    ctx.shadowColor = '#00F5FF';
    ctx.shadowBlur = 14 * pulse;
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, size * 0.16, size * 0.09, side * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,245,255,${0.7 * pulse})`;
    ctx.fill();
    ctx.strokeStyle = '#00F5FF';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
  });

  // Chin repulsor (blue circle)
  const repY = cy + size * 0.5;
  ctx.shadowColor = '#00F5FF';
  ctx.shadowBlur = 18 * pulse;
  ctx.beginPath();
  ctx.arc(cx, repY, size * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0,100,255,${0.85 * pulse})`;
  ctx.fill();
  ctx.strokeStyle = '#00F5FF';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // MARK L text
  ctx.shadowColor = '#FFB703';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#FFB703';
  ctx.font = `bold ${size * 0.14}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('MARK L', cx, cy - size * 0.62);
  ctx.shadowBlur = 0;
}

// ─── ALIEN EYES ───────────────────────────────────────────────────
function drawAlienEyes(ctx, w, h, frame) {
  const cx = w / 2;
  const ey = h * 0.32;
  const eyeW = w * 0.16;
  const eyeH = h * 0.09;
  const pupilBob = Math.sin(frame * 0.04) * 5;
  const pulse = Math.sin(frame * 0.08) * 0.2 + 0.8;

  [-1, 1].forEach((side) => {
    const ex = cx + side * w * 0.18;
    // Outer glow
    ctx.shadowColor = '#00F5FF';
    ctx.shadowBlur = 20;
    // Eye white (alien cyan)
    ctx.beginPath();
    ctx.ellipse(ex, ey, eyeW, eyeH, side * -0.2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,245,255,${0.7 * pulse})`;
    ctx.fill();
    ctx.strokeStyle = '#00F5FF';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Slit pupil
    ctx.beginPath();
    ctx.ellipse(ex + side * 5, ey + pupilBob, eyeW * 0.15, eyeH * 0.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,50,0.85)';
    ctx.fill();

    // Pupil shine
    ctx.beginPath();
    ctx.arc(ex + side * 3 - 3, ey + pupilBob - 3, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
  });

  // "ALIEN DETECTED" tag
  ctx.fillStyle = '#00F5FF';
  ctx.font = `bold ${w * 0.025}px monospace`;
  ctx.textAlign = 'center';
  ctx.shadowColor = '#00F5FF';
  ctx.shadowBlur = 8;
  ctx.fillText('// ALIEN DETECTED //', cx, ey + eyeH + 24);
  ctx.shadowBlur = 0;
}

// ─── CROWN ────────────────────────────────────────────────────────
function drawCrown(ctx, w, h, frame) {
  const cx = w / 2;
  const topY = h * 0.06;
  const cw = w * 0.5;
  const ch = h * 0.16;
  const pulse = Math.sin(frame * 0.07) * 0.12 + 0.88;

  ctx.shadowColor = '#FFB703';
  ctx.shadowBlur = 16 * pulse;

  // Crown body
  ctx.beginPath();
  ctx.moveTo(cx - cw / 2, topY + ch);
  ctx.lineTo(cx - cw / 2, topY + ch * 0.3);
  // Left point
  ctx.lineTo(cx - cw * 0.3, topY + ch * 0.6);
  // Left mid
  ctx.lineTo(cx - cw * 0.15, topY);
  // Center point
  ctx.lineTo(cx, topY + ch * 0.3);
  ctx.lineTo(cx, topY);
  ctx.lineTo(cx, topY + ch * 0.3);
  // Right mid
  ctx.lineTo(cx + cw * 0.15, topY);
  ctx.lineTo(cx + cw * 0.3, topY + ch * 0.6);
  // Right point
  ctx.lineTo(cx + cw / 2, topY + ch * 0.3);
  ctx.lineTo(cx + cw / 2, topY + ch);
  ctx.closePath();

  const grad = ctx.createLinearGradient(cx - cw / 2, topY, cx + cw / 2, topY + ch);
  grad.addColorStop(0, '#FFD700');
  grad.addColorStop(0.5, '#FFB703');
  grad.addColorStop(1, '#CC8800');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#FFF8DC';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Gems
  const gems = [
    { x: cx - cw * 0.3, y: topY + ch * 0.65, color: '#FF006E' },
    { x: cx,            y: topY + ch * 0.65, color: '#00F5FF' },
    { x: cx + cw * 0.3, y: topY + ch * 0.65, color: '#8B5CF6' },
  ];
  gems.forEach(({ x, y, color }) => {
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(x, y, cw * 0.045, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, cw * 0.015, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fill();
  });

  ctx.shadowBlur = 0;
}

// ─── NEON SUNGLASSES ─────────────────────────────────────────────
function drawNeonShades(ctx, w, h, frame) {
  const cx = w / 2;
  const gy = h * 0.38;
  const gw = w * 0.62;
  const gh = h * 0.1;
  const pulse = Math.sin(frame * 0.1) * 0.3 + 0.7;

  ctx.shadowColor = '#00F5FF';
  ctx.shadowBlur = 20 * pulse;
  ctx.strokeStyle = '#00F5FF';
  ctx.lineWidth = 3;

  // Left lens
  ctx.beginPath();
  ctx.roundRect(cx - gw / 2, gy - gh / 2, gw * 0.45, gh, gh * 0.3);
  ctx.fillStyle = `rgba(0,245,255,${0.25 * pulse})`;
  ctx.fill();
  ctx.stroke();

  // Right lens
  ctx.beginPath();
  ctx.roundRect(cx + gw * 0.05, gy - gh / 2, gw * 0.45, gh, gh * 0.3);
  ctx.fillStyle = `rgba(0,245,255,${0.25 * pulse})`;
  ctx.fill();
  ctx.stroke();

  // Bridge
  ctx.beginPath();
  ctx.moveTo(cx - gw * 0.02, gy);
  ctx.lineTo(cx + gw * 0.02, gy);
  ctx.stroke();

  // Arms (temple pieces)
  ctx.beginPath();
  ctx.moveTo(cx - gw / 2, gy);
  ctx.lineTo(cx - gw / 2 - 20, gy + 5);
  ctx.moveTo(cx + gw / 2, gy);
  ctx.lineTo(cx + gw / 2 + 20, gy + 5);
  ctx.stroke();

  // Lens shine
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.moveTo(cx + side * (gw * 0.12), gy - gh * 0.3);
    ctx.lineTo(cx + side * (gw * 0.06), gy + gh * 0.1);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  ctx.shadowBlur = 0;
}

// ─── HALO + DEVIL HORNS ──────────────────────────────────────────
function drawHaloHorns(ctx, w, h, frame) {
  const cx = w / 2;
  const headY = h * 0.2;
  const haloR = w * 0.22;
  const pulse = Math.sin(frame * 0.06) * 0.2 + 0.8;
  const hornPulse = Math.sin(frame * 0.08 + Math.PI) * 0.15 + 0.85;

  // Halo (golden circle)
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 18 * pulse;
  ctx.strokeStyle = `rgba(255,215,0,${0.85 * pulse})`;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(cx, headY - 5, haloR, haloR * 0.25, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Devil Horns
  const hornBaseY = headY - 5;
  const hornH = h * 0.1;
  ctx.shadowColor = '#FF006E';
  ctx.shadowBlur = 14 * hornPulse;
  [-1, 1].forEach((side) => {
    const bx = cx + side * haloR * 0.5;
    ctx.beginPath();
    ctx.moveTo(bx - side * 15, hornBaseY + 10);
    ctx.lineTo(bx + side * 8, hornBaseY - hornH);
    ctx.lineTo(bx + side * 30, hornBaseY);
    ctx.closePath();
    ctx.fillStyle = `rgba(200,0,50,${0.85 * hornPulse})`;
    ctx.fill();
    ctx.strokeStyle = '#FF006E';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  ctx.shadowBlur = 0;
}

// ─── BUNNY EARS ──────────────────────────────────────────────────
function drawBunnyEars(ctx, w, h, frame) {
  const cx = w / 2;
  const baseY = h * 0.22;
  const earH = h * 0.28;
  const earW = w * 0.1;
  const wobble = Math.sin(frame * 0.06) * 5;

  [-1, 1].forEach((side) => {
    const ex = cx + side * w * 0.18;
    // Outer ear
    ctx.beginPath();
    ctx.ellipse(ex + side * wobble * 0.3, baseY - earH / 2, earW, earH / 2, side * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
    ctx.strokeStyle = '#E8E8FF';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Inner ear (pink)
    ctx.beginPath();
    ctx.ellipse(ex + side * wobble * 0.3, baseY - earH / 2, earW * 0.45, earH * 0.38, side * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,150,200,0.85)';
    ctx.fill();
  });
}

// ─── GLITCH FACE ─────────────────────────────────────────────────
function drawGlitchFace(ctx, w, h, frame) {
  if (frame % 8 < 2) return; // Flicker effect
  const numBars = 4 + Math.floor(Math.random() * 4);
  for (let i = 0; i < numBars; i++) {
    const gy = Math.random() * h;
    const bh = 4 + Math.random() * 20;
    const shift = (Math.random() - 0.5) * 60;
    const color = Math.random() < 0.5 ? 'rgba(0,245,255,0.4)' : 'rgba(255,0,110,0.4)';
    ctx.fillStyle = color;
    ctx.fillRect(shift, gy, w, bh);
  }
  // SIGNAL LOST text every 30 frames
  if (frame % 60 < 15) {
    ctx.fillStyle = '#FF006E';
    ctx.font = `bold ${w * 0.07}px monospace`;
    ctx.textAlign = 'center';
    ctx.shadowColor = '#FF006E';
    ctx.shadowBlur = 20;
    ctx.fillText('SIGNAL LOST', w / 2, h / 2);
    ctx.shadowBlur = 0;
  }
}

// ─── STAR LORD HELMET ────────────────────────────────────────────
function drawStarLord(ctx, w, h, frame) {
  const cx = w / 2;
  const topY = h * 0.04;
  const helmW = w * 0.5;
  const helmH = h * 0.26;
  const pulse = Math.sin(frame * 0.07) * 0.15 + 0.85;

  // Helmet dome
  ctx.beginPath();
  ctx.ellipse(cx, topY + helmH * 0.4, helmW / 2, helmH * 0.55, 0, Math.PI, 0);
  ctx.strokeStyle = `rgba(180,180,200,${0.8 * pulse})`;
  ctx.lineWidth = 3;
  ctx.shadowColor = '#8B5CF6';
  ctx.shadowBlur = 12 * pulse;
  ctx.stroke();

  // Visor (red-orange)
  ctx.beginPath();
  ctx.ellipse(cx, topY + helmH * 0.55, helmW * 0.38, helmH * 0.12, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,80,0,${0.55 * pulse})`;
  ctx.fill();
  ctx.strokeStyle = '#F97316';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Star-Lord label
  ctx.fillStyle = '#E8E8FF';
  ctx.font = `bold ${w * 0.025}px monospace`;
  ctx.textAlign = 'center';
  ctx.shadowColor = '#8B5CF6';
  ctx.shadowBlur = 8;
  ctx.fillText('// STAR-LORD //', cx, topY + helmH + 16);
  ctx.shadowBlur = 0;
}
