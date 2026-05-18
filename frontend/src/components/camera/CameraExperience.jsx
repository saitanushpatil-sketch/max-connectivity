import { useRef, useState, useEffect, useCallback } from 'react';
import { FILTERS, getFilter, drawFilteredFrame, renderFilterThumbnail } from '../../utils/cameraFilters';
import { OVERLAYS, drawOverlay } from '../../utils/cameraOverlays';
import { saveGalleryPhoto, downloadPhoto } from '../../utils/galleryStorage';
import ShareToChatModal from './ShareToChatModal';

// ─── Filter Thumbnail Strip ───────────────────────────────────────
function FilterThumb({ filter, isActive, videoRef, onClick }) {
  const thumbRef = useRef(null);
  const thumbIntervalRef = useRef(null);

  useEffect(() => {
    const updateThumb = () => {
      const video = videoRef.current;
      const canvas = thumbRef.current;
      if (!canvas || !video || video.readyState < 2) return;
      const ctx = canvas.getContext('2d');
      drawFilteredFrame(ctx, video, 96, 72, filter.id, 0);
    };
    updateThumb();
    thumbIntervalRef.current = setInterval(updateThumb, 250); // 4fps
    return () => clearInterval(thumbIntervalRef.current);
  }, [filter.id, videoRef]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-shrink-0 flex flex-col items-center gap-1"
      style={{ scrollSnapAlign: 'start' }}
    >
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 8,
          overflow: 'hidden',
          border: isActive ? '2px solid #00F5FF' : '1px solid #252535',
          boxShadow: isActive ? '0 0 12px rgba(0,245,255,0.6)' : 'none',
          transition: 'border 0.2s, box-shadow 0.2s',
          background: '#0A0A0F',
        }}
      >
        <canvas ref={thumbRef} width={96} height={72} style={{ width: 60, height: 45, display: 'block' }} />
      </div>
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: 8,
          color: isActive ? '#00F5FF' : '#6B6B8A',
          letterSpacing: 1,
          textTransform: 'uppercase',
          maxWidth: 60,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {filter.name}
      </span>
    </button>
  );
}

// ─── Draw Overlay on Canvas ───────────────────────────────────────
function DrawCanvas({ dataUrl, color, onDone }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPt = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new window.Image();
    img.src = dataUrl;
    img.onload = () => { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); };
  }, [dataUrl]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const onStart = (e) => {
    drawing.current = true;
    lastPt.current = getPos(e);
  };
  const onMove = (e) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pt = getPos(e);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastPt.current.x, lastPt.current.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPt.current = pt;
  };
  const onEnd = () => { drawing.current = false; lastPt.current = null; };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col" style={{ background: '#000' }}>
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="flex-1 w-full touch-none"
        style={{ cursor: 'crosshair' }}
        onMouseDown={onStart}
        onMouseMove={onMove}
        onMouseUp={onEnd}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
      />
      <div className="p-3 flex justify-between items-center" style={{ background: 'rgba(0,0,0,0.9)' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#6B6B8A' }}>DRAW MODE</span>
        <button
          type="button"
          onClick={() => {
            const canvas = canvasRef.current;
            if (canvas) onDone(canvas.toDataURL('image/jpeg', 0.92));
          }}
          style={{ fontFamily: 'monospace', fontSize: 11, color: '#00F5FF', border: '1px solid #00F5FF', padding: '4px 14px', borderRadius: 4 }}
        >
          DONE ✓
        </button>
      </div>
    </div>
  );
}

// ─── Post-Capture Screen ──────────────────────────────────────────
function PostCapture({ preview, onRetake, onClose }) {
  const [caption, setCaption] = useState('');
  const [showCaption, setShowCaption] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [drawColor, setDrawColor] = useState('#00F5FF');
  const [currentPreview, setCurrentPreview] = useState(preview);
  const [captionPos, setCaptionPos] = useState({ x: 50, y: 85 });
  const draggingCaption = useRef(false);

  const DRAW_COLORS = ['#00F5FF', '#FF006E', '#06D6A0', '#ffffff', '#000000'];

  const handleSave = () => {
    saveGalleryPhoto(currentPreview, caption);
    // Flash feedback
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;background:rgba(0,245,255,0.2);z-index:9999;pointer-events:none;';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 300);
  };

  if (drawMode) {
    return (
      <DrawCanvas
        dataUrl={currentPreview}
        color={drawColor}
        onDone={(newUrl) => { setCurrentPreview(newUrl); setDrawMode(false); }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#000' }}>
      {/* Preview image */}
      <div className="relative flex-1 overflow-hidden">
        <img src={currentPreview} alt="Preview" className="absolute inset-0 w-full h-full object-contain" />
        {caption && showCaption && (
          <div
            className="absolute"
            style={{
              left: `${captionPos.x}%`,
              top: `${captionPos.y}%`,
              transform: 'translate(-50%,-50%)',
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 22,
              fontWeight: 700,
              color: '#fff',
              textShadow: '0 0 8px rgba(0,0,0,0.8)',
              cursor: 'grab',
              userSelect: 'none',
              padding: '4px 10px',
              background: 'rgba(0,0,0,0.45)',
              borderRadius: 6,
              backdropFilter: 'blur(4px)',
            }}
          >
            {caption}
          </div>
        )}
      </div>

      {/* Toolbar slide-up */}
      <div
        className="flex-shrink-0 pt-3 pb-6 px-4 flex flex-col gap-3"
        style={{ background: 'rgba(10,10,15,0.97)', borderTop: '1px solid #252535' }}
      >
        {/* Caption input */}
        {showCaption && (
          <input
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              background: '#12121A',
              border: '1px solid #00F5FF',
              color: '#E8E8FF',
              fontFamily: 'monospace',
              fontSize: 13,
              outline: 'none',
            }}
            placeholder="Add caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            autoFocus
          />
        )}

        {/* Action row */}
        <div className="flex gap-2 justify-center">
          {[
            { label: '✏️ DRAW', action: () => setDrawMode(true) },
            { label: '💬 TEXT', action: () => setShowCaption(!showCaption) },
          ].map(({ label, action }) => (
            <button
              key={label}
              type="button"
              onClick={action}
              style={{
                flex: 1,
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#E8E8FF',
                background: '#12121A',
                border: '1px solid #252535',
                borderRadius: 8,
                padding: '8px 4px',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Draw color picker */}
        {drawMode === false && (
          <div className="flex gap-2 justify-center">
            {DRAW_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDrawColor(c)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: c,
                  border: drawColor === c ? '3px solid #fff' : '2px solid #252535',
                }}
              />
            ))}
          </div>
        )}

        {/* Main actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            style={{
              flex: 1,
              fontFamily: 'Rajdhani, sans-serif',
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: 2,
              color: '#00F5FF',
              background: 'rgba(0,245,255,0.1)',
              border: '1px solid #00F5FF',
              borderRadius: 10,
              padding: '12px 8px',
            }}
          >
            💾 SAVE
          </button>
          <button
            type="button"
            onClick={() => setShowShare(true)}
            style={{
              flex: 1,
              fontFamily: 'Rajdhani, sans-serif',
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: 2,
              color: '#06D6A0',
              background: 'rgba(6,214,160,0.1)',
              border: '1px solid #06D6A0',
              borderRadius: 10,
              padding: '12px 8px',
            }}
          >
            📤 SHARE
          </button>
          <button
            type="button"
            onClick={() => downloadPhoto(currentPreview)}
            style={{
              flex: 1,
              fontFamily: 'Rajdhani, sans-serif',
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: 2,
              color: '#FFB703',
              background: 'rgba(255,183,3,0.1)',
              border: '1px solid #FFB703',
              borderRadius: 10,
              padding: '12px 8px',
            }}
          >
            ⬇ DL
          </button>
        </div>

        {/* Retake */}
        <button
          type="button"
          onClick={onRetake}
          style={{ fontFamily: 'monospace', fontSize: 11, color: '#FF006E', letterSpacing: 2, textAlign: 'center' }}
        >
          ← RETAKE
        </button>
      </div>

      {showShare && (
        <ShareToChatModal photoDataUrl={currentPreview} caption={caption} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}

// ─── Main CameraExperience ────────────────────────────────────────
export default function CameraExperience({ onClose }) {
  const videoRef = useRef(null);
  const mainCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(0);
  const rafRef = useRef(null);
  const countdownRef = useRef(null);

  const [facing, setFacing] = useState('user');
  const [flash, setFlash] = useState(false);
  const [filterId, setFilterId] = useState('normal');
  const [overlayId, setOverlayId] = useState('none');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [flashOverlay, setFlashOverlay] = useState(false);

  // ── Camera start ──────────────────────────────────────────────
  const startCamera = useCallback(async (mode) => {
    setError('');
    setReady(false);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setReady(true);
    } catch (err) {
      setError(err.name === 'NotAllowedError' ? 'denied' : 'failed');
    }
  }, []);

  useEffect(() => {
    startCamera(facing);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facing, startCamera]);

  // ── Main render loop ──────────────────────────────────────────
  useEffect(() => {
    const loop = () => {
      const video = videoRef.current;
      const canvas = mainCanvasRef.current;
      if (video && canvas && ready && !preview) {
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 480;
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
        const ctx = canvas.getContext('2d');

        // Apply filter via pixel manipulation
        drawFilteredFrame(ctx, video, w, h, filterId, frameRef.current);
        // Draw AR overlay on top
        drawOverlay(ctx, w, h, overlayId, frameRef.current);

        frameRef.current += 1;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [ready, filterId, overlayId, preview]);

  // ── Capture ───────────────────────────────────────────────────
  const doCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    const cap = document.createElement('canvas');
    cap.width = w;
    cap.height = h;
    const ctx = cap.getContext('2d');
    drawFilteredFrame(ctx, video, w, h, filterId, frameRef.current);
    drawOverlay(ctx, w, h, overlayId, frameRef.current);
    if (flash) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(0, 0, w, h);
    }
    setPreview(cap.toDataURL('image/jpeg', 0.93));
  }, [filterId, overlayId, flash]);

  const captureWithCountdown = useCallback(() => {
    if (countdown !== null) return;
    let c = 3;
    setCountdown(c);
    setFlashOverlay(false);
    countdownRef.current = setInterval(() => {
      c -= 1;
      if (c <= 0) {
        clearInterval(countdownRef.current);
        setCountdown(null);
        setFlashOverlay(true);
        setTimeout(() => setFlashOverlay(false), 200);
        setTimeout(doCapture, 50);
      } else {
        setCountdown(c);
      }
    }, 1000);
  }, [countdown, doCapture]);

  const capture = useCallback(() => {
    setFlashOverlay(true);
    setTimeout(() => setFlashOverlay(false), 150);
    doCapture();
  }, [doCapture]);

  const toggleFacing = () => setFacing((f) => (f === 'user' ? 'environment' : 'user'));
  const retake = () => { setPreview(null); };

  // ── Error Screen ──────────────────────────────────────────────
  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center p-6 z-50" style={{ background: '#0A0A0F' }}>
        <button type="button" onClick={onClose} className="absolute top-6 left-4 w-10 h-10 rounded-full flex items-center justify-center" style={{ border: '1px solid #252535', color: '#E8E8FF', background: '#12121A' }}>✕</button>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
        <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 22, fontWeight: 700, color: '#00F5FF', marginBottom: 12, letterSpacing: 2 }}>CAMERA ACCESS REQUIRED</h2>
        <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#6B6B8A', textAlign: 'center', maxWidth: 280, marginBottom: 24, lineHeight: 1.7 }}>
          Allow camera permission to use MAX Camera.
        </p>
        <button type="button" onClick={() => startCamera(facing)} style={{ fontFamily: 'monospace', fontSize: 13, color: '#00F5FF', border: '1px solid #00F5FF', background: 'rgba(0,245,255,0.1)', padding: '12px 32px', borderRadius: 8 }}>
          TRY AGAIN
        </button>
      </div>
    );
  }

  // ── Post-Capture ──────────────────────────────────────────────
  if (preview) {
    return <PostCapture preview={preview} onRetake={retake} onClose={onClose} />;
  }

  // ── Main Camera View ──────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ background: '#000' }}>
      {/* Video feed (CSS filter removed - Canvas handles it) */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0 }} // hidden — canvas overlays it
      />
      {/* Filtered canvas — full viewport */}
      <canvas
        ref={mainCanvasRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ pointerEvents: 'none' }}
      />

      {/* Flash white overlay */}
      {flashOverlay && (
        <div className="absolute inset-0 z-[60] pointer-events-none" style={{ background: 'rgba(255,255,255,0.6)' }} />
      )}

      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 z-[65] flex items-center justify-center pointer-events-none">
          <div
            key={countdown}
            style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 160,
              fontWeight: 900,
              color: '#00F5FF',
              textShadow: '0 0 40px rgba(0,245,255,0.8)',
              animation: 'countdownPop 0.9s ease-out',
            }}
          >
            {countdown}
          </div>
        </div>
      )}

      {/* ── TOP BAR ───────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-10 pb-3" style={{ background: 'linear-gradient(rgba(0,0,0,0.55), transparent)' }}>
        <button type="button" onClick={onClose} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFlash(!flash)}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: flash ? 'rgba(0,245,255,0.35)' : 'rgba(0,0,0,0.55)',
              border: flash ? '2px solid #00F5FF' : '1px solid rgba(255,255,255,0.2)',
              color: flash ? '#00F5FF' : '#fff', fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >⚡</button>
          <button
            type="button"
            onClick={toggleFacing}
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.2)', color: '#00F5FF', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >🔄</button>
        </div>
      </div>

      {/* ── BOTTOM CONTROLS ───────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pb-8 pt-4" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.88))' }}>

        {/* AR Overlay selector */}
        <div className="flex gap-2 px-4 mb-3 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          {OVERLAYS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setOverlayId(o.id === overlayId ? 'none' : o.id)}
              style={{
                flexShrink: 0,
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: overlayId === o.id ? 'rgba(0,245,255,0.25)' : 'rgba(0,0,0,0.55)',
                border: overlayId === o.id ? '2px solid #00F5FF' : '1px solid rgba(255,255,255,0.2)',
                fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: overlayId === o.id ? '0 0 12px rgba(0,245,255,0.5)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {o.icon}
            </button>
          ))}
        </div>

        {/* Filter thumbnail strip */}
        <div
          className="flex gap-3 px-4 mb-5 overflow-x-auto"
          style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', paddingBottom: 4 }}
        >
          {FILTERS.map((f) => (
            <FilterThumb
              key={f.id}
              filter={f}
              isActive={filterId === f.id}
              videoRef={videoRef}
              onClick={() => setFilterId(f.id)}
            />
          ))}
        </div>

        {/* Capture row */}
        <div className="flex items-center justify-center gap-8 px-8">
          {/* Gallery placeholder */}
          <div style={{ width: 48, height: 48, borderRadius: 10, background: '#12121A', border: '1px solid #252535' }} />

          {/* Capture button */}
          <button
            type="button"
            onClick={capture}
            onLongPress={() => captureWithCountdown()}
            disabled={!ready}
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              border: '4px solid #fff',
              background: 'rgba(255,255,255,0.15)',
              boxShadow: '0 0 24px rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform 0.1s',
              cursor: ready ? 'pointer' : 'not-allowed',
              opacity: ready ? 1 : 0.5,
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.93)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.93)'}
            onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff' }} />
          </button>

          {/* Timer capture */}
          <button
            type="button"
            onClick={captureWithCountdown}
            disabled={!ready}
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#E8E8FF',
              fontSize: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ⏱
          </button>
        </div>
      </div>

      <style>{`
        @keyframes countdownPop {
          0% { transform: scale(1.6); opacity: 0.4; }
          40% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1.0); opacity: 0.9; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
