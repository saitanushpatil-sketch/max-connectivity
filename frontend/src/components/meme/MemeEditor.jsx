import { useState, useEffect, useRef, useCallback } from 'react';
import hapticTap from '../../utils/haptic';

const CANVAS_SIZE = 500;

function drawMemeText(ctx, text, y) {
  if (!text) return;
  const upper = text.toUpperCase();
  const maxWidth = CANVAS_SIZE - 40;
  ctx.font = 'bold 42px Impact, Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#FFFFFF';
  const lines = wrapText(ctx, upper, maxWidth);
  const lineHeight = 48;
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => {
    const ly = startY + i * lineHeight;
    ctx.strokeText(line, CANVAS_SIZE / 2, ly);
    ctx.fillText(line, CANVAS_SIZE / 2, ly);
  });
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  words.forEach((word) => {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

export default function MemeEditor({ template, onSend, onCancel }) {
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [sending, setSending] = useState(false);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img?.complete) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    drawMemeText(ctx, topText, 60);
    drawMemeText(ctx, bottomText, CANVAS_SIZE - 60);
  }, [topText, bottomText]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      renderCanvas();
    };
    img.src = template.src;
    imageRef.current = img;
  }, [template.src, renderCanvas]);

  useEffect(() => {
    renderCanvas();
  }, [topText, bottomText, renderCanvas]);

  const handleSend = async () => {
    setSending(true);
    hapticTap(10);
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      await onSend?.(dataUrl, template.name);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col"
      style={{ background: 'rgba(10,10,15,0.97)', backdropFilter: 'blur(12px)' }}
    >
      <div className="px-4 pt-10 pb-3 flex items-center justify-between" style={{ borderBottom: '1px solid #00F5FF33' }}>
        <span className="font-heading text-lg font-bold tracking-wider" style={{ color: '#00F5FF' }}>
          MEME FORGE
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="font-mono text-xs px-3 py-1 rounded-sm"
          style={{ border: '1px solid #252535', color: '#6B6B8A' }}
        >
          CANCEL
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col items-center px-4 py-4 gap-4">
        <p className="font-mono text-[10px] tracking-widest" style={{ color: '#6B6B8A' }}>
          {template.name.toUpperCase()}
        </p>
        <div
          className="rounded-sm overflow-hidden w-full max-w-[min(100%,500px)]"
          style={{ border: '2px solid #00F5FF', boxShadow: '0 0 24px rgba(0,245,255,0.25)' }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="w-full h-auto block"
            style={{ aspectRatio: '1' }}
          />
        </div>

        <div className="w-full max-w-[min(100%,500px)] flex flex-col gap-3">
          <div>
            <label className="font-mono text-[10px] tracking-widest mb-1 block" style={{ color: '#6B6B8A' }}>
              TOP TEXT
            </label>
            <input
              className="hud-input w-full px-3 py-2 rounded-sm text-sm"
              value={topText}
              onChange={(e) => setTopText(e.target.value)}
              placeholder="WHEN YOU..."
              maxLength={80}
            />
          </div>
          <div>
            <label className="font-mono text-[10px] tracking-widest mb-1 block" style={{ color: '#6B6B8A' }}>
              BOTTOM TEXT
            </label>
            <input
              className="hud-input w-full px-3 py-2 rounded-sm text-sm"
              value={bottomText}
              onChange={(e) => setBottomText(e.target.value)}
              placeholder="BUT ALSO..."
              maxLength={80}
            />
          </div>
        </div>
      </div>

      <div className="px-4 pb-8 pt-3 flex gap-3" style={{ borderTop: '1px solid #252535' }}>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-sm font-mono text-xs tracking-widest"
          style={{ border: '1px solid #252535', color: '#6B6B8A' }}
        >
          CANCEL
        </button>
        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="flex-1 py-3 rounded-sm font-heading font-bold text-xs tracking-widest"
          style={{
            background: 'linear-gradient(135deg, #00F5FF, #0099CC)',
            border: '1px solid #00F5FF',
            color: '#0A0A0F',
            opacity: sending ? 0.7 : 1,
          }}
        >
          {sending ? 'SENDING...' : 'SEND MEME'}
        </button>
      </div>
    </div>
  );
}
