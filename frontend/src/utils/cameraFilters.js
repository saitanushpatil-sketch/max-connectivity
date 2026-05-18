/**
 * Camera Filters — Canvas 2D pixel manipulation engine
 * Each filter processes ImageData (RGB channels) for real-time quality
 */

export const FILTERS = [
  { id: 'normal',    name: 'NORMAL',   emoji: '○' },
  { id: 'jarvis',    name: 'JARVIS',   emoji: '◈' },
  { id: 'neon',      name: 'NEON GLOW',emoji: '✦' },
  { id: 'vintage',   name: 'VINTAGE',  emoji: '⊛' },
  { id: 'noir',      name: 'NOIR',     emoji: '◐' },
  { id: 'golden',    name: 'GOLDEN',   emoji: '☀' },
  { id: 'cyberpunk', name: 'CYBER',    emoji: '⚡' },
  { id: 'glitch',    name: 'GLITCH',   emoji: '▦' },
  { id: 'matrix',    name: 'MATRIX',   emoji: '⌗' },
  { id: 'vaporwave', name: 'VAPOR',    emoji: '◈' },
  { id: 'infrared',  name: 'INFRARED', emoji: '◉' },
  { id: 'deepfry',   name: 'DEEP FRY', emoji: '🔥' },
  { id: 'soft',      name: 'SOFT',     emoji: '◌' },
  { id: 'dramatic',  name: 'CINEMA',   emoji: '▬' },
  { id: 'hologram',  name: 'HOLO',     emoji: '◫' },
];

export function getFilter(id) {
  return FILTERS.find((f) => f.id === id) || FILTERS[0];
}

// ─── Pixel Helpers ────────────────────────────────────────────────

function clamp(v) { return Math.max(0, Math.min(255, v)); }

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  return [
    Math.round(hue2rgb(h + 1/3) * 255),
    Math.round(hue2rgb(h) * 255),
    Math.round(hue2rgb(h - 1/3) * 255),
  ];
}

/** Apply sepia matrix to RGB */
function applySepiaRgb(r, g, b, amount) {
  const nr = clamp(r * (1 - 0.607 * amount) + g * 0.769 * amount + b * 0.189 * amount);
  const ng = clamp(r * 0.349 * amount + g * (1 - 0.314 * amount) + b * 0.168 * amount);
  const nb = clamp(r * 0.272 * amount + g * 0.534 * amount + b * (1 - 0.869 * amount));
  return [nr, ng, nb];
}

/** Vignette factor 0→1 at center, 0 at edges */
function vignette(x, y, w, h, strength) {
  const dx = (x / w - 0.5) * 2;
  const dy = (y / h - 0.5) * 2;
  return Math.max(0, 1 - Math.sqrt(dx*dx + dy*dy) * strength);
}

// ─── Filter Functions ────────────────────────────────────────────

/** 1. NORMAL — passthrough */
function filterNormal(data) { /* no-op */ }

/** 2. JARVIS SCAN */
function filterJarvis(data, w, h) {
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % w;
    const y = Math.floor(i / 4 / w);
    let r = data[i], g = data[i+1], b = data[i+2];
    // Slight green channel boost
    g = clamp(g * 1.15);
    // Cyan tint at 20%
    r = clamp(r * 0.8);
    b = clamp(b + 51);
    // Scanlines every 4px
    if (y % 4 === 0) { r = clamp(r * 0.9); g = clamp(g * 0.9); b = clamp(b * 0.9); }
    data[i] = r; data[i+1] = g; data[i+2] = b;
  }
}

/** 3. NEON GLOW */
function filterNeon(data, w, h) {
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i+1], b = data[i+2];
    const [hue, sat, lit] = rgbToHsl(r, g, b);
    const newSat = Math.min(1, sat * 2.5);
    const newLit = lit < 0.5 ? lit * 0.7 : Math.min(1, lit * 1.3);
    const [nr, ng, nb] = hslToRgb(hue, newSat, newLit);
    data[i] = nr; data[i+1] = ng; data[i+2] = nb;
  }
}

/** 4. VINTAGE FILM */
function filterVintage(data, w, h, frame) {
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % w;
    const y = Math.floor(i / 4 / w);
    let r = data[i], g = data[i+1], b = data[i+2];
    // Sepia
    [r, g, b] = applySepiaRgb(r, g, b, 0.7);
    // Warm cast #FFB703
    r = clamp(r + 20); g = clamp(g + 8); b = clamp(b - 15);
    // Film grain
    const grain = (Math.random() - 0.5) * 40;
    r = clamp(r + grain); g = clamp(g + grain); b = clamp(b + grain);
    // Vignette
    const vig = vignette(x, y, w, h, 1.2);
    r *= vig; g *= vig; b *= vig;
    // Random horizontal scratches
    if (Math.random() < 0.0005) {
      r = 255; g = 255; b = 220;
    }
    data[i] = r; data[i+1] = g; data[i+2] = b;
  }
}

/** 5. NOIR DETECTIVE */
function filterNoir(data, w, h) {
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % w;
    const y = Math.floor(i / 4 / w);
    let r = data[i], g = data[i+1], b = data[i+2];
    // Grayscale
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    // Heavy contrast
    const c = clamp((gray - 128) * 1.8 + 128);
    // Blue tint in darks
    const blueBoost = c < 100 ? (100 - c) * 0.25 : 0;
    const grain = (Math.random() - 0.5) * 25;
    const vig = vignette(x, y, w, h, 1.4);
    data[i]   = clamp((c + grain) * vig);
    data[i+1] = clamp((c + grain) * vig);
    data[i+2] = clamp((c + blueBoost + grain) * vig);
  }
}

/** 6. GOLDEN HOUR */
function filterGolden(data, w, h) {
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i+1], b = data[i+2];
    // Warm orange/amber
    r = clamp(r * 1.25 + 30);
    g = clamp(g * 1.1 + 10);
    b = clamp(b * 0.75 - 20);
    // Boost highlights
    const lum = (r + g + b) / 3;
    if (lum > 180) {
      r = clamp(r + (255 - r) * 0.4);
      g = clamp(g + (255 - g) * 0.3);
    }
    data[i] = r; data[i+1] = g; data[i+2] = b;
  }
}

/** 7. CYBERPUNK 2077 */
function filterCyberpunk(data, w, h) {
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i+1], b = data[i+2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    // Split toning: shadows = teal, highlights = magenta
    const shadowT = Math.max(0, 1 - lum / 128);
    const highlightT = Math.max(0, (lum - 128) / 127);
    r = clamp(r * 1.4 - 20 * shadowT + 50 * highlightT);
    g = clamp(g * 0.9 + 30 * shadowT - 20 * highlightT);
    b = clamp(b * 1.1 + 40 * shadowT - 30 * highlightT);
    const [h2, s2, l2] = rgbToHsl(r, g, b);
    const [nr, ng, nb] = hslToRgb(h2, Math.min(1, s2 * 2.2), l2);
    data[i] = nr; data[i+1] = ng; data[i+2] = nb;
  }
}

/** 8. GLITCH ART */
function filterGlitch(data, w, h, frame) {
  const glitchActive = Math.floor(frame / 15) % 2 === 0;
  for (let i = 0; i < data.length; i += 4) {
    const y = Math.floor(i / 4 / w);
    let r = data[i], g = data[i+1], b = data[i+2];
    if (glitchActive && Math.random() < 0.05) {
      // Invert strip
      r = 255 - r; g = 255 - g; b = 255 - b;
    }
    // Desaturate to create "signal loss" look
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = clamp(r * 0.7 + gray * 0.3 + (Math.random() - 0.5) * 30);
    b = clamp(b * 0.7 + gray * 0.3 + (Math.random() - 0.5) * 30);
    data[i] = r; data[i+1] = g; data[i+2] = b;
  }
}

/** 9. MATRIX */
function filterMatrix(data, w, h) {
  for (let i = 0; i < data.length; i += 4) {
    const y = Math.floor(i / 4 / w);
    let r = data[i], g = data[i+1], b = data[i+2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    // Strong green tint #00FF41
    r = clamp(gray * 0.1);
    g = clamp(gray * 1.4);
    b = clamp(gray * 0.1);
    // High contrast + scanlines
    const contrast = (g - 128) * 1.6 + 128;
    g = clamp(contrast);
    if (y % 3 === 0) { r *= 0.85; g *= 0.85; b *= 0.85; }
    data[i] = r; data[i+1] = g; data[i+2] = b;
  }
}

/** 10. VAPORWAVE DREAM */
function filterVaporwave(data, w, h) {
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i+1], b = data[i+2];
    const [h2, s2, l2] = rgbToHsl(r, g, b);
    // Shift hues towards pink/purple
    const newH = (h2 + 0.75) % 1;
    const newS = Math.min(1, s2 * 2.0);
    const newL = Math.min(0.9, l2 * 1.15);
    const [nr, ng, nb] = hslToRgb(newH, newS, newL);
    // Pastel blend: mix with original
    data[i]   = clamp(nr * 0.65 + r * 0.35 + 30);
    data[i+1] = clamp(ng * 0.65 + g * 0.35 - 20);
    data[i+2] = clamp(nb * 0.65 + b * 0.35 + 40);
  }
}

/** 11. INFRARED */
function filterInfrared(data, w, h) {
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i+1], b = data[i+2];
    // Swap R and G channels, boost saturation
    const temp = r;
    r = clamp(g * 1.5);
    g = clamp(temp * 0.5);
    b = clamp(b * 0.8);
    // High contrast
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const cf = (lum - 128) * 1.5 + 128;
    const ratio = lum > 0 ? cf / lum : 1;
    data[i]   = clamp(r * ratio);
    data[i+1] = clamp(g * ratio);
    data[i+2] = clamp(b * ratio);
  }
}

/** 12. DEEP FRY */
function filterDeepFry(data, w, h) {
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i+1], b = data[i+2];
    // Maximum saturation
    const [h2, s2, l2] = rgbToHsl(r, g, b);
    const [nr, ng, nb] = hslToRgb(h2, Math.min(1, s2 * 4), l2);
    // Maximum contrast
    const cr = clamp((nr - 128) * 2.5 + 128);
    const cg = clamp((ng - 128) * 2.5 + 128);
    const cb = clamp((nb - 128) * 2.5 + 128);
    // Warm cast + grain
    const grain = (Math.random() - 0.5) * 50;
    data[i]   = clamp(cr + 40 + grain);
    data[i+1] = clamp(cg + 15 + grain);
    data[i+2] = clamp(cb - 20 + grain);
  }
}

/** 13. SOFT BEAUTY */
function filterSoft(data, w, h) {
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % w;
    const y = Math.floor(i / 4 / w);
    let r = data[i], g = data[i+1], b = data[i+2];
    // Brightness +10%
    r = clamp(r * 1.1); g = clamp(g * 1.1); b = clamp(b * 1.1);
    // Saturation -10%
    const [h2, s2, l2] = rgbToHsl(r, g, b);
    const [nr, ng, nb] = hslToRgb(h2, s2 * 0.9, l2);
    // Warm highlight boost
    const lum = (nr + ng + nb) / 3;
    const wr = lum > 200 ? 10 : 0;
    // Soft vignette
    const vig = vignette(x, y, w, h, 0.6);
    const vf = 0.7 + vig * 0.3;
    data[i]   = clamp((nr + wr) * vf);
    data[i+1] = clamp((ng + wr * 0.5) * vf);
    data[i+2] = clamp(nb * vf);
  }
}

/** 14. DRAMATIC CINEMA */
function filterDramatic(data, w, h) {
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % w;
    const y = Math.floor(i / 4 / w);
    let r = data[i], g = data[i+1], b = data[i+2];
    // S-curve contrast
    const sCurve = (v) => {
      const n = v / 255;
      const s = n < 0.5 ? 2 * n * n : -1 + (4 - 2 * n) * n;
      return clamp(s * 255 * 1.15);
    };
    r = sCurve(r); g = sCurve(g); b = sCurve(b);
    // Teal shadows, orange highlights (Hollywood LUT)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const shadow = Math.max(0, 1 - lum / 100);
    const highlight = Math.max(0, (lum - 155) / 100);
    r = clamp(r + 20 * highlight - 5 * shadow);
    g = clamp(g - 5 * highlight + 5 * shadow);
    b = clamp(b - 10 * highlight + 15 * shadow);
    // Film grain
    const grain = (Math.random() - 0.5) * 15;
    // Crushed blacks
    r = r < 15 ? 0 : r; g = g < 15 ? 0 : g; b = b < 15 ? 0 : b;
    data[i]   = clamp(r + grain);
    data[i+1] = clamp(g + grain);
    data[i+2] = clamp(b + grain);
  }
}

/** 15. HOLOGRAM */
function filterHologram(data, w, h, frame) {
  const pulse = 0.85 + Math.sin(frame * 0.08) * 0.15;
  for (let i = 0; i < data.length; i += 4) {
    const y = Math.floor(i / 4 / w);
    let r = data[i], g = data[i+1], b = data[i+2];
    // Desaturate 50%
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = r * 0.5 + gray * 0.5;
    g = g * 0.5 + gray * 0.5;
    b = b * 0.5 + gray * 0.5;
    // Strong cyan tint
    r = clamp(r * 0.4);
    g = clamp(g * 1.1 + 20);
    b = clamp(b * 1.3 + 40);
    // Scanlines
    if (y % 3 === 0) { r *= 0.7; g *= 0.7; b *= 0.7; }
    // Pulsing
    data[i]   = clamp(r * pulse);
    data[i+1] = clamp(g * pulse);
    data[i+2] = clamp(b * pulse);
  }
}

const FILTER_FNS = {
  normal:    filterNormal,
  jarvis:    filterJarvis,
  neon:      filterNeon,
  vintage:   filterVintage,
  noir:      filterNoir,
  golden:    filterGolden,
  cyberpunk: filterCyberpunk,
  glitch:    filterGlitch,
  matrix:    filterMatrix,
  vaporwave: filterVaporwave,
  infrared:  filterInfrared,
  deepfry:   filterDeepFry,
  soft:      filterSoft,
  dramatic:  filterDramatic,
  hologram:  filterHologram,
};

/**
 * Draw video frame to canvas with filter applied via pixel manipulation.
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLVideoElement} video
 * @param {number} w
 * @param {number} h
 * @param {string} filterId
 * @param {number} frame - animation frame counter
 */
export function drawFilteredFrame(ctx, video, w, h, filterId, frame = 0) {
  if (!filterId || filterId === 'normal') {
    ctx.drawImage(video, 0, 0, w, h);
    return;
  }
  ctx.drawImage(video, 0, 0, w, h);
  try {
    const imageData = ctx.getImageData(0, 0, w, h);
    const fn = FILTER_FNS[filterId];
    if (fn) fn(imageData.data, w, h, frame);
    ctx.putImageData(imageData, 0, 0);
  } catch (e) {
    // Fallback: just show plain video (CORS / security error)
  }
}

/**
 * Render a filter thumbnail at small size (thumbnailW x thumbnailH).
 * Returns data URL or null.
 */
export function renderFilterThumbnail(video, filterId, tw = 96, th = 72) {
  if (!video || video.readyState < 2) return null;
  const offscreen = document.createElement('canvas');
  offscreen.width = tw;
  offscreen.height = th;
  const ctx = offscreen.getContext('2d');
  drawFilteredFrame(ctx, video, tw, th, filterId, 0);
  return offscreen.toDataURL('image/jpeg', 0.6);
}
