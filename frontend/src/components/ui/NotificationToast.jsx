import { useEffect, useRef, useState } from 'react';
import hapticTap from '../../utils/haptic';

export default function NotificationToast({ toast, onDismiss, onAction }) {
  const [startY, setStartY] = useState(0);
  const [dragY, setDragY] = useState(0);
  const chimeRef = useRef(null);

  // Play subtle Web Audio chime on arrival
  useEffect(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      chimeRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Muted soft HUD chime (400Hz)
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn('Notification chime failed:', e);
    }

    return () => {
      if (chimeRef.current && chimeRef.current.state !== 'closed') {
        try { chimeRef.current.close(); } catch (e) {}
      }
    };
  }, []);

  const handleTouchStart = (e) => setStartY(e.touches[0].clientY);
  const handleTouchMove = (e) => {
    const diff = e.touches[0].clientY - startY;
    // Only allow drag up (dismiss)
    if (diff < 0) {
      setDragY(diff);
    }
  };
  const handleTouchEnd = () => {
    if (dragY < -50) {
      hapticTap(5);
      onDismiss(toast.id);
    } else {
      setDragY(0);
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success': return '#06D6A0';
      case 'error': return '#FF006E';
      case 'call': return '#FFB703';
      default: return '#00F5FF';
    }
  };

  const getAvatarLetter = () => {
    if (toast.sender?.displayName) {
      return toast.sender.displayName.substring(0, 2).toUpperCase();
    }
    return 'MX';
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={() => { hapticTap(10); onAction?.(toast); }}
      className={`w-full max-w-app px-4 py-3 flex gap-3 bg-[#12121A] border-l-4 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] cursor-pointer select-none transition-all active:scale-98`}
      style={{
        borderColor: getBorderColor(),
        transform: `translateY(${dragY}px)`,
        animation: 'slideDownEnter 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        border: '1px solid #252535',
        borderLeftWidth: 4,
      }}
    >
      <style>{`
        @keyframes slideDownEnter {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Left icon / Avatar */}
      <div 
        className="w-10 h-10 rounded-full flex flex-shrink-0 items-center justify-center font-mono font-bold text-[#0A0A0F]"
        style={{ background: toast.sender?.avatarColor || getBorderColor() }}
      >
        {getAvatarLetter()}
      </div>

      {/* Middle Text */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <span className="font-heading font-semibold text-sm text-[#E8E8FF] truncate">
            {toast.sender?.displayName || toast.title || 'MAX Notification'}
          </span>
          <span className="font-mono text-[9px] text-[#6B6B8A]">just now</span>
        </div>
        <p className="font-mono text-xs text-[#6B6B8A] truncate leading-tight">
          {toast.body || toast.content || toast.message}
        </p>

        {/* Action Buttons for Call */}
        {toast.type === 'call' && (
          <div className="flex gap-2 mt-2" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => { hapticTap(10); onDismiss(toast.id); }}
              className="px-3 py-1 bg-[#FF006E]/15 border border-[#FF006E]/30 rounded font-mono text-[9px] text-[#FF006E] tracking-wider"
            >
              DECLINE
            </button>
            <button 
              onClick={() => { hapticTap(10); onAction?.(toast); }}
              className="px-3 py-1 bg-[#00F5FF]/15 border border-[#00F5FF]/30 rounded font-mono text-[9px] text-[#00F5FF] tracking-wider"
            >
              ACCEPT
            </button>
          </div>
        )}
      </div>

      {/* Dismiss button */}
      <button 
        onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
        className="text-[#6B6B8A] self-center p-1"
      >
        ✕
      </button>
    </div>
  );
}
