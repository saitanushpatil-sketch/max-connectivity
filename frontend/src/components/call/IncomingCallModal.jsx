import { useEffect } from 'react';
import Avatar from '../ui/Avatar';

export default function IncomingCallModal({ caller, callType, onAccept, onReject }) {
  useEffect(() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let playing = true;

    const playRing = () => {
      if (!playing) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      osc.type = 'sine';
      gain.gain.value = 0.3;
      osc.start();
      setTimeout(() => {
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.stop(ctx.currentTime + 0.1);
        if (playing) setTimeout(playRing, 2500);
      }, 1000);
    };

    playRing();
    const autoReject = setTimeout(() => onReject(), 30000);

    return () => {
      playing = false;
      clearTimeout(autoReject);
      ctx.close();
    };
  }, [onReject]);

  if (!caller) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(10,10,15,0.97)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 24,
    }}>
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{
            position: 'absolute',
            inset: -(i * 20),
            borderRadius: '50%',
            border: '1px solid rgba(0,245,255,0.2)',
            animation: `pulse ${i * 0.5 + 1}s ease-out infinite`,
          }} />
        ))}
        <Avatar user={caller} size={120} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: 11, color: '#6B6B8A',
          letterSpacing: '0.2em', marginBottom: 8,
        }}>
          {callType === 'video' ? '📹 INCOMING VIDEO CALL' : '📞 INCOMING VOICE CALL'}
        </p>
        <h2 style={{
          fontFamily: 'Rajdhani, sans-serif', fontSize: 32,
          fontWeight: 700, color: '#E8E8FF', margin: 0,
        }}>
          {caller.displayName || caller.username}
        </h2>
        <p style={{
          fontFamily: 'Share Tech Mono, monospace', fontSize: 12,
          color: '#6B6B8A', marginTop: 4,
        }}>
          @{caller.username}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 48, marginTop: 16 }}>
        <button type="button" onClick={onReject} style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, #FF006E, #cc0055)',
          border: 'none', cursor: 'pointer', fontSize: 28,
          boxShadow: '0 0 20px rgba(255,0,110,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          📵
        </button>
        <button type="button" onClick={onAccept} style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, #06D6A0, #04a87c)',
          border: 'none', cursor: 'pointer', fontSize: 28,
          boxShadow: '0 0 20px rgba(6,214,160,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {callType === 'video' ? '📹' : '📞'}
        </button>
      </div>

      <p style={{
        fontFamily: 'Share Tech Mono, monospace', fontSize: 10,
        color: '#3A3A4A', marginTop: 8,
      }}>
        🔒 END-TO-END ENCRYPTED
      </p>
    </div>
  );
}
