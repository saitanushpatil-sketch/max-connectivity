import { useState, useRef, useEffect } from 'react';
import hapticTap from '../../utils/haptic';

export default function MemeEditor({ template, onCancel, onSend }) {
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [fontSize, setFontSize] = useState(40);
  const [color, setColor] = useState('#FFFFFF');
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Important for external APIs like Imgflip
    img.src = template.url || template.src;
    img.onload = () => {
      imgRef.current = img;
      drawCanvas();
    };
  }, [template]);

  useEffect(() => {
    if (imgRef.current) drawCanvas();
  }, [topText, bottomText, fontSize, color]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;

    // Set canvas dimensions to match image
    canvas.width = img.width;
    canvas.height = img.height;

    // Draw image
    ctx.drawImage(img, 0, 0);

    // Setup text style
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(2, fontSize / 10);
    ctx.font = `900 ${fontSize}px Impact, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const renderText = (text, y, isBottom) => {
      if (!text) return;
      const lines = text.toUpperCase().split('\n');
      const lineHeight = fontSize * 1.2;
      const startY = isBottom ? y - (lines.length * lineHeight) + fontSize : y;
      
      lines.forEach((line, i) => {
        ctx.strokeText(line, canvas.width / 2, startY + (i * lineHeight));
        ctx.fillText(line, canvas.width / 2, startY + (i * lineHeight));
      });
    };

    renderText(topText, 10, false);
    renderText(bottomText, canvas.height - 20, true);
  };

  const handleSend = () => {
    hapticTap(10);
    if (!canvasRef.current) return;
    const base64 = canvasRef.current.toDataURL('image/jpeg', 0.85);
    onSend(base64, template.name);
  };

  const COLORS = ['#FFFFFF', '#000000', '#00F5FF', '#FFB703', '#FF006E'];

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0A0A0F' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#252535] bg-[#12121A]">
        <button type="button" onClick={onCancel} className="text-[#6B6B8A] font-mono text-sm tracking-wider">CANCEL</button>
        <span className="font-heading font-bold text-[#00F5FF] tracking-widest text-lg">MEME EDITOR</span>
        <button type="button" onClick={handleSend} className="text-[#00F5FF] font-mono text-sm tracking-wider font-bold">SEND</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        {/* Preview */}
        <div className="w-full flex justify-center bg-[#12121A] rounded-xl border border-[#252535] overflow-hidden" style={{ minHeight: 200, maxHeight: '45vh' }}>
          <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="TOP TEXT"
            value={topText}
            onChange={(e) => setTopText(e.target.value)}
            className="w-full bg-[#12121A] border border-[#252535] rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-[#00F5FF] uppercase"
          />
          <input
            type="text"
            placeholder="BOTTOM TEXT"
            value={bottomText}
            onChange={(e) => setBottomText(e.target.value)}
            className="w-full bg-[#12121A] border border-[#252535] rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-[#00F5FF] uppercase"
          />
          
          <div className="flex items-center gap-4 mt-2">
            <span className="font-mono text-xs text-[#6B6B8A] w-12">SIZE</span>
            <input 
              type="range" 
              min="20" 
              max="120" 
              value={fontSize} 
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="flex-1 accent-[#00F5FF]"
            />
          </div>

          <div className="flex items-center gap-4 mt-2">
            <span className="font-mono text-xs text-[#6B6B8A] w-12">COLOR</span>
            <div className="flex gap-3">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full border-2"
                  style={{ background: c, borderColor: color === c ? '#00F5FF' : '#252535' }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
