import { useRef, useState, useEffect, useCallback } from 'react';
import { saveGalleryPhoto, downloadPhoto } from '../../utils/galleryStorage';

const CSS_FILTERS = [
  { id: 'normal', name: 'Normal', filter: 'none' },
  { id: 'grayscale', name: 'B&W', filter: 'grayscale(100%)' },
  { id: 'sepia', name: 'Sepia', filter: 'sepia(100%)' },
  { id: 'contrast', name: 'High Contrast', filter: 'contrast(150%)' },
  { id: 'brightness', name: 'Bright', filter: 'brightness(130%)' },
  { id: 'saturate', name: 'Vivid', filter: 'saturate(200%)' },
  { id: 'invert', name: 'Invert', filter: 'invert(100%)' },
  { id: 'blur', name: 'Soft', filter: 'blur(2px)' },
  { id: 'hue-rotate', name: 'Hue', filter: 'hue-rotate(90deg)' },
  { id: 'warm', name: 'Warm', filter: 'sepia(30%) saturate(140%)' },
];

function PostCapture({ preview, onRetake, onClose }) {
  const handleSave = () => {
    saveGalleryPhoto(preview, '');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#000' }}>
      <img src={preview} alt="Preview" className="flex-1 w-full h-full object-contain" />
      <div className="flex-shrink-0 p-4 flex gap-2" style={{ background: 'rgba(10,10,15,0.97)', borderTop: '1px solid #252535' }}>
        <button onClick={handleSave} style={{ flex: 1, padding: 12, background: 'rgba(0,245,255,0.1)', border: '1px solid #00F5FF', color: '#00F5FF', borderRadius: 8, fontFamily: 'Rajdhani', fontWeight: 700 }}>
          💾 SAVE
        </button>
        <button onClick={() => downloadPhoto(preview)} style={{ flex: 1, padding: 12, background: 'rgba(255,183,3,0.1)', border: '1px solid #FFB703', color: '#FFB703', borderRadius: 8, fontFamily: 'Rajdhani', fontWeight: 700 }}>
          ⬇ DOWNLOAD
        </button>
        <button onClick={onRetake} style={{ flex: 1, padding: 12, background: 'rgba(255,0,110,0.1)', border: '1px solid #FF006E', color: '#FF006E', borderRadius: 8, fontFamily: 'Rajdhani', fontWeight: 700 }}>
          ← RETAKE
        </button>
      </div>
    </div>
  );
}

export default function CameraExperience({ onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [facing, setFacing] = useState('user');
  const [filterId, setFilterId] = useState('normal');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState(null);
  const [flash, setFlash] = useState(false);

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
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facing, startCamera]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    const cap = document.createElement('canvas');
    cap.width = w;
    cap.height = h;
    const ctx = cap.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);
    if (flash) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(0, 0, w, h);
    }
    setPreview(cap.toDataURL('image/jpeg', 0.93));
  }, [flash]);

  const toggleFacing = () => setFacing((f) => (f === 'user' ? 'environment' : 'user'));
  const currentFilter = CSS_FILTERS.find((f) => f.id === filterId)?.filter || 'none';

  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center p-6 z-50" style={{ background: '#0A0A0F' }}>
        <button type="button" onClick={onClose} className="absolute top-6 left-4 w-10 h-10 rounded-full flex items-center justify-center" style={{ border: '1px solid #252535', color: '#E8E8FF', background: '#12121A' }}>✕</button>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
        <h2 style={{ fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 700, color: '#00F5FF', marginBottom: 12, letterSpacing: 2 }}>CAMERA ACCESS REQUIRED</h2>
        <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#6B6B8A', textAlign: 'center', maxWidth: 280, marginBottom: 24, lineHeight: 1.7 }}>
          Allow camera permission to use MAX Camera.
        </p>
        <button type="button" onClick={() => startCamera(facing)} style={{ fontFamily: 'monospace', fontSize: 13, color: '#00F5FF', border: '1px solid #00F5FF', background: 'rgba(0,245,255,0.1)', padding: '12px 32px', borderRadius: 8 }}>
          TRY AGAIN
        </button>
      </div>
    );
  }

  if (preview) {
    return <PostCapture preview={preview} onRetake={() => setPreview(null)} onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ background: '#000' }}>
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: currentFilter }}
      />

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
            }}
          >⚡</button>
          <button
            type="button"
            onClick={toggleFacing}
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.2)', color: '#00F5FF', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >🔄</button>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 pb-8 pt-4" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.88))' }}>
        <div className="flex gap-3 px-4 mb-5 overflow-x-auto" style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', paddingBottom: 4 }}>
          {CSS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterId(f.id)}
              style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                scrollSnapAlign: 'start',
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: filterId === f.id ? '2px solid #00F5FF' : '1px solid #252535',
                  boxShadow: filterId === f.id ? '0 0 12px rgba(0,245,255,0.6)' : 'none',
                  background: '#0A0A0F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1A1A26', filter: f.filter }} />
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: 8, color: filterId === f.id ? '#00F5FF' : '#6B6B8A', letterSpacing: 1, textTransform: 'uppercase' }}>
                {f.name}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center gap-8 px-8">
          <div style={{ width: 48, height: 48, borderRadius: 10, background: '#12121A', border: '1px solid #252535' }} />
          <button
            type="button"
            onClick={capture}
            disabled={!ready}
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              border: '4px solid #fff',
              background: 'rgba(255,255,255,0.15)',
              boxShadow: '0 0 24px rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: ready ? 'pointer' : 'not-allowed',
              opacity: ready ? 1 : 0.5,
            }}
          >
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff' }} />
          </button>
          <div style={{ width: 48, height: 48 }} />
        </div>
      </div>
    </div>
  );
}
