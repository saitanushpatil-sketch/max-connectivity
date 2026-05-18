export const FILTERS = [
  { id: 'normal', name: 'NORMAL', css: 'none', canvas: false },
  { id: 'jarvis', name: 'JARVIS', css: 'sepia(0.3) hue-rotate(160deg) saturate(2)', canvas: false },
  { id: 'neon-pink', name: 'NEON', css: 'hue-rotate(280deg) saturate(3) brightness(1.2)', canvas: false },
  { id: 'vintage', name: 'VINTAGE', css: 'sepia(0.8) contrast(1.2) brightness(0.9)', canvas: false },
  { id: 'noir', name: 'NOIR', css: 'grayscale(1) contrast(1.5)', canvas: false },
  { id: 'cold', name: 'COLD', css: 'hue-rotate(200deg) saturate(0.7) brightness(1.1)', canvas: false },
  { id: 'golden', name: 'GOLDEN', css: 'sepia(0.4) saturate(1.8) brightness(1.15) hue-rotate(15deg)', canvas: false },
  { id: 'glitch', name: 'GLITCH', css: 'contrast(1.4) saturate(2) hue-rotate(180deg)', canvas: true },
  { id: 'matrix', name: 'MATRIX', css: 'hue-rotate(90deg) saturate(3) brightness(0.8) contrast(1.4)', canvas: false },
  { id: 'infrared', name: 'INFRARED', css: 'hue-rotate(0deg) saturate(2) sepia(0.5) contrast(1.3)', canvas: false },
  { id: 'vaporwave', name: 'VAPOR', css: 'hue-rotate(260deg) saturate(2.5) brightness(1.3)', canvas: false },
  { id: 'deepfry', name: 'DEEP FRY', css: 'saturate(5) contrast(2) brightness(1.4)', canvas: false },
  { id: 'soft', name: 'SOFT', css: 'brightness(1.1) contrast(0.9) saturate(0.9) blur(0.5px)', canvas: false },
  { id: 'dramatic', name: 'DRAMA', css: 'contrast(1.8) brightness(0.85) saturate(1.3)', canvas: false },
  { id: 'cyberpunk', name: 'CYBER', css: 'hue-rotate(150deg) saturate(2) contrast(1.3) brightness(1.1)', canvas: false },
];

export function getFilter(id) {
  return FILTERS.find((f) => f.id === id) || FILTERS[0];
}

export function applyGlitch(ctx, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(0,245,255,0.15)';
  ctx.fillRect(3, 0, w, h);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(255,0,110,0.12)';
  ctx.fillRect(-3, 0, w, h);
  ctx.restore();
}

export function drawFilteredFrame(ctx, video, w, h, filterId) {
  const filter = getFilter(filterId);
  ctx.filter = filter.css === 'none' ? 'none' : filter.css;
  ctx.drawImage(video, 0, 0, w, h);
  ctx.filter = 'none';
  if (filter.id === 'glitch') applyGlitch(ctx, w, h);
}
