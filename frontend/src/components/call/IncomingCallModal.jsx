import { useEffect } from 'react';
import Avatar from '../ui/Avatar';

export default function IncomingCallModal({ caller, callType, onAccept, onReject }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let playing = true;
    let ctx = null;

    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { return; }

    const playRing = () => {
      if (!playing || !ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 440;
        osc.type = 'sine';
        gain.gain.value = 0.25;
        osc.start();
        setTimeout(() => {
          try {
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
            osc.stop(ctx.currentTime + 0.1);
          } catch { /* */ }
          if (playing) setTimeout(playRing, 2500);
        }, 800);
      } catch { /* */ }
    };

    playRing();
    const autoReject = setTimeout(() => onReject(), 30000);

    return () => {
      playing = false;
      clearTimeout(autoReject);
      try { ctx?.close(); } catch { /* */ }
    };
  }, []); // eslint-disable-line

  if (!caller) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(10,10,15,0.97)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 24,
    }}>
      {/* Pulse rings */}
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{
            position: 'absolute',
            inset: -(i * 20),
            borderRadius: '50%',
            border: `1px solid rgba(0,245,255,${0.3 - i * 0.08})`,
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
          {caller.displayName || caller.username || 'Incoming Call'}
        </h2>
        <p style={{
          fontFamily: 'Share Tech Mono, monospace', fontSize: 12,
          color: '#6B6B8A', marginTop: 4,
        }}>
          @{caller.username}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 56, marginTop: 16 }}>
        {/* Decline */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <button type="button" onClick={onReject} style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #FF006E, #cc0055)',
            border: 'none', cursor: 'pointer', fontSize: 28,
            boxShadow: '0 0 24px rgba(255,0,110,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.1s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            📵
          </button>
          <span style={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: '#FF006E' }}>DECLINE</span>
        </div>

        {/* Accept */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <button type="button" onClick={onAccept} style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #06D6A0, #04a87c)',
            border: 'none', cursor: 'pointer', fontSize: 28,
            boxShadow: '0 0 24px rgba(6,214,160,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.1s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {callType === 'video' ? '📹' : '📞'}
          </button>
          <span style={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: '#06D6A0' }}>ACCEPT</span>
        </div>
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
