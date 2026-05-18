import { useRef, useState, useEffect, useCallback } from 'react';
import { FILTERS, getFilter, drawFilteredFrame } from '../../utils/cameraFilters';
import { OVERLAYS, drawOverlay } from '../../utils/cameraOverlays';
import { saveGalleryPhoto, downloadPhoto } from '../../utils/galleryStorage';
import ShareToChatModal from './ShareToChatModal';

export default function CameraExperience({ onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(0);
  const rafRef = useRef(null);

  const [facing, setFacing] = useState('user');
  const [flash, setFlash] = useState(false);
  const [filterId, setFilterId] = useState('normal');
  const [overlayId, setOverlayId] = useState('none');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [showShare, setShowShare] = useState(false);
  const [showCaption, setShowCaption] = useState(false);

  const startCamera = useCallback(async (mode) => {
    setError('');
    setReady(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
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

  useEffect(() => {
    const loop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && ready && !preview) {
        const w = canvas.width = video.videoWidth || 640;
        const h = canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);
        drawOverlay(ctx, w, h, overlayId, frameRef.current);
        frameRef.current += 1;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [ready, overlayId, preview]);

  const toggleFacing = () => setFacing((f) => (f === 'user' ? 'environment' : 'user'));

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    const cap = document.createElement('canvas');
    cap.width = w;
    cap.height = h;
    const ctx = cap.getContext('2d');
    const filter = getFilter(filterId);
    if (filter.id === 'glitch') {
      ctx.drawImage(video, 3, 0, w, h);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(0,245,255,0.2)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(video, -3, 0, w, h);
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(255,0,110,0.15)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      drawFilteredFrame(ctx, video, w, h, filterId);
    }
    drawOverlay(ctx, w, h, overlayId, frameRef.current);
    if (flash) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(0, 0, w, h);
    }
    setPreview(cap.toDataURL('image/jpeg', 0.92));
  };

  const retake = () => {
    setPreview(null);
    setCaption('');
    setShowCaption(false);
  };

  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center p-6 z-50" style={{ background: '#0A0A0F' }}>
        <button type="button" onClick={onClose} className="absolute top-6 left-4 w-10 h-10 rounded-sm font-mono" style={{ border: '1px solid #252535', color: '#E8E8FF' }}>✕</button>
        <h2 className="font-heading text-xl mb-4" style={{ color: '#00F5FF' }}>CAMERA ACCESS REQUIRED</h2>
        <p className="font-mono text-xs text-center max-w-sm mb-4" style={{ color: '#6B6B8A' }}>
          Allow camera access in your browser settings to use MAX Camera.
        </p>
        <div className="p-4 rounded-sm max-w-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
          <p className="font-mono text-[10px] mb-2" style={{ color: '#FFB703' }}>iOS SAFARI:</p>
          <p className="font-mono text-[10px]" style={{ color: '#B0B0C8' }}>
            Settings → Safari → Camera → Allow. Then reload this page.
          </p>
        </div>
        <button type="button" onClick={() => startCamera(facing)} className="hud-btn hud-btn-primary mt-6 px-6 py-2 rounded-sm text-sm">
          TRY AGAIN
        </button>
      </div>
    );
  }

  if (preview) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0A0A0F' }}>
        <img src={preview} alt="Preview" className="flex-1 object-contain w-full" />
        {showCaption && (
          <input
            className="hud-input mx-4 mb-2 px-3 py-2 rounded-sm text-sm"
            placeholder="Add caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        )}
        <div className="p-4 flex flex-col gap-2" style={{ background: 'rgba(18,18,26,0.95)' }}>
          <button type="button" onClick={() => { saveGalleryPhoto(preview, caption); }} className="hud-btn hud-btn-primary py-3 rounded-sm text-sm">
            SAVE TO GALLERY
          </button>
          <button type="button" onClick={() => setShowShare(true)} className="hud-btn py-3 rounded-sm text-sm" style={{ border: '1px solid #00F5FF', color: '#00F5FF' }}>
            SHARE IN CHAT
          </button>
          <button type="button" onClick={() => downloadPhoto(preview)} className="hud-btn py-2 rounded-sm text-xs" style={{ color: '#6B6B8A' }}>
            DOWNLOAD
          </button>
          <button type="button" onClick={() => setShowCaption(!showCaption)} className="font-mono text-[10px]" style={{ color: '#6B6B8A' }}>
            {showCaption ? 'HIDE CAPTION' : 'ADD CAPTION'}
          </button>
          <button type="button" onClick={retake} className="font-mono text-[10px] tracking-widest" style={{ color: '#FF006E' }}>
            RETAKE
          </button>
        </div>
        {showShare && <ShareToChatModal photoDataUrl={preview} caption={caption} onClose={() => setShowShare(false)} />}
      </div>
    );
  }

  const filter = getFilter(filterId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ background: '#000' }}>
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: filter.css, transition: 'filter 0.2s ease' }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none object-cover" />

      <button type="button" onClick={onClose} className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid #252535' }}>✕</button>
      <button type="button" onClick={() => setFlash(!flash)} className="absolute top-4 left-16 z-10 w-10 h-10 rounded-full text-lg" style={{ background: flash ? 'rgba(0,245,255,0.3)' : 'rgba(0,0,0,0.5)', border: '1px solid #252535' }}>⚡</button>
      <button type="button" onClick={toggleFacing} className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid #252535', color: '#00F5FF' }}>🔄</button>

      <div className="absolute bottom-0 left-0 right-0 z-10 pb-6 pt-4" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.85))' }}>
        <div className="flex justify-center gap-2 px-3 mb-3 overflow-x-auto">
          {OVERLAYS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setOverlayId(o.id)}
              className="flex-shrink-0 w-9 h-9 rounded-full font-mono text-xs"
              style={{
                background: overlayId === o.id ? 'rgba(0,245,255,0.25)' : 'rgba(0,0,0,0.5)',
                border: overlayId === o.id ? '2px solid #00F5FF' : '1px solid #252535',
                color: '#E8E8FF',
              }}
            >
              {o.icon}
            </button>
          ))}
        </div>

        <div className="flex gap-2 px-3 mb-4 overflow-x-auto scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterId(f.id)}
              className="flex-shrink-0 flex flex-col items-center gap-1"
            >
              <div
                className="w-12 h-12 rounded-full"
                style={{
                  background: `linear-gradient(135deg, #12121A, #252535)`,
                  border: filterId === f.id ? '2px solid #00F5FF' : '1px solid #252535',
                  boxShadow: filterId === f.id ? '0 0 12px rgba(0,245,255,0.5)' : 'none',
                  filter: f.css,
                  opacity: 0.85,
                }}
              />
              <span className="font-mono text-[8px]" style={{ color: filterId === f.id ? '#00F5FF' : '#6B6B8A' }}>{f.name}</span>
            </button>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={capture}
            disabled={!ready}
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ border: '4px solid #00F5FF', background: 'rgba(0,245,255,0.15)', boxShadow: '0 0 20px rgba(0,245,255,0.4)' }}
          >
            <div className="w-12 h-12 rounded-full" style={{ background: '#00F5FF' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
