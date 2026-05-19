import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import useWebRTC from '../../hooks/useWebRTC';
import { getSocket } from '../../hooks/useSocket';
import { retrieveCallFromSession } from '../../context/callStore';
import api from '../../utils/api';

export const getServerSideProps = async () => ({ props: {} });

export default function CallPage() {
  const router = useRouter();
  const { friendId } = router.query;

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const initiatedRef = useRef(false);

  const [friend, setFriend] = useState(null);
  const [statusText, setStatusText] = useState('CONNECTING...');
  const [callEnded, setCallEnded] = useState(false);
  const [endReason, setEndReason] = useState('');

  const socket = getSocket();

  const {
    callState, isMuted, isVideoOff, formattedDuration,
    startCall, answerCall, endCall,
    handleIceCandidate, handleAnswer,
    toggleMute, toggleVideo, flipCamera,
  } = useWebRTC({ socket, localVideoRef, remoteVideoRef });

  // Load friend info
  useEffect(() => {
    if (!friendId) return;
    api.get(`/users/${friendId}`)
      .then((r) => setFriend(r.data.user || r.data))
      .catch(() => {});
  }, [friendId]);

  // Initiate or answer the call once router is ready
  useEffect(() => {
    if (!router.isReady || !friendId || initiatedRef.current) return;

    // Wait for socket to be available (retry up to 3s)
    let attempts = 0;
    const tryInit = () => {
      const s = getSocket();
      if (!s?.connected) {
        if (++attempts < 30) return setTimeout(tryInit, 100);
        setStatusText('NO CONNECTION');
        return;
      }
      initiatedRef.current = true;
      const callType = router.query.type || 'video';
      const isIncoming = router.query.incoming === 'true';

      if (isIncoming) {
        const stored = retrieveCallFromSession();
        if (stored) {
          setStatusText('ANSWERING...');
          const from = stored.from || stored.callerId || friendId;
          answerCall(from, stored.offer, stored.callType || callType);
        } else {
          // Fallback — navigate back if no stored call data
          setEndReason('Call data lost');
          setCallEnded(true);
        }
      } else {
        setStatusText('RINGING...');
        startCall(friendId, callType);
      }
    };
    tryInit();
  }, [router.isReady, friendId]); // eslint-disable-line

  // Sync status text with callState
  useEffect(() => {
    if (callState === 'connected') setStatusText('● CONNECTED');
    if (callState === 'calling') setStatusText('RINGING...');
    if (callState === 'idle' && initiatedRef.current) setStatusText('ENDED');
  }, [callState]);

  // Socket event listeners
  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    const onAnswered = ({ answer }) => handleAnswer(answer);
    const onIce = ({ candidate }) => handleIceCandidate(candidate);
    const onEnded = () => {
      setEndReason('Call ended');
      setCallEnded(true);
    };
    const onRejected = () => {
      setEndReason('Call declined');
      setCallEnded(true);
    };
    const onBusy = () => {
      setEndReason('User is busy');
      setCallEnded(true);
    };

    s.on('call:answered', onAnswered);
    s.on('call:ice', onIce);
    s.on('call:ended', onEnded);
    s.on('call:rejected', onRejected);
    s.on('call:busy', onBusy);

    return () => {
      s.off('call:answered', onAnswered);
      s.off('call:ice', onIce);
      s.off('call:ended', onEnded);
      s.off('call:rejected', onRejected);
      s.off('call:busy', onBusy);
    };
  }, [handleAnswer, handleIceCandidate]);

  // Auto-navigate back after call ends
  useEffect(() => {
    if (!callEnded) return;
    const timer = setTimeout(() => router.back(), 2000);
    return () => clearTimeout(timer);
  }, [callEnded, router]);

  const handleEndCall = useCallback(() => {
    endCall(friendId);
    setEndReason('You ended the call');
    setCallEnded(true);
  }, [endCall, friendId]);

  const isVideo = router.query.type !== 'audio';
  const friendName = friend?.displayName || friend?.username || '...';
  const friendInitial = (friend?.displayName || friend?.username || '?')[0]?.toUpperCase();
  const friendColor = friend?.avatarColor || '#00F5FF';

  if (callEnded) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#0A0A0F',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 16, zIndex: 9998,
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 8,
          background: `${friendColor}22`,
          border: `2px solid ${friendColor}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, color: friendColor,
          fontFamily: 'Rajdhani, sans-serif', fontWeight: 700,
        }}>
          {friendInitial}
        </div>
        <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 22, color: '#E8E8FF', fontWeight: 600 }}>
          {friendName}
        </p>
        <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 12, color: '#6B6B8A' }}>
          {endReason || 'Call ended'} · {formattedDuration}
        </p>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0A0A0F',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', zIndex: 9998,
    }}>
      {/* Remote video (full screen) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          background: '#12121A',
          display: callState === 'connected' && isVideo ? 'block' : 'none',
        }}
      />

      {/* Pre-connect / audio call overlay */}
      {(callState !== 'connected' || !isVideo) && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: callState === 'connected'
            ? 'linear-gradient(180deg, #0A0A0F 0%, #12121A 100%)'
            : '#0A0A0F',
          gap: 16,
        }}>
          {/* Pulse rings */}
          <div style={{ position: 'relative', width: 100, height: 100 }}>
            {callState !== 'connected' && [1, 2].map((i) => (
              <div key={i} style={{
                position: 'absolute',
                inset: -(i * 18),
                borderRadius: '50%',
                border: `1px solid rgba(0,245,255,${0.15 - i * 0.05})`,
                animation: `pulse ${i * 0.6 + 1.2}s ease-out infinite`,
              }} />
            ))}
            <div style={{
              width: 100, height: 100, borderRadius: 8,
              background: `${friendColor}22`,
              border: `2px solid ${friendColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, color: friendColor,
              fontFamily: 'Rajdhani, sans-serif', fontWeight: 700,
              boxShadow: `0 0 30px ${friendColor}33`,
            }}>
              {friendInitial}
            </div>
          </div>
          <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 26, color: '#E8E8FF', fontWeight: 600, margin: 0 }}>
            {friendName}
          </p>
          <p style={{
            fontFamily: 'Share Tech Mono, monospace', fontSize: 12,
            color: callState === 'connected' ? '#06D6A0' : '#6B6B8A',
            animation: callState !== 'connected' ? 'pulse 1.5s infinite' : 'none',
          }}>
            {callState === 'connected' ? `● CONNECTED · ${formattedDuration}` : statusText}
          </p>
          <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#3A3A4A', marginTop: 8 }}>
            🔒 END-TO-END ENCRYPTED
          </p>
        </div>
      )}

      {/* Local video (picture-in-picture) */}
      {isVideo && (
        <div style={{
          position: 'absolute', bottom: 110, right: 16,
          width: 90, height: 130, borderRadius: 12,
          overflow: 'hidden',
          border: '2px solid rgba(0,245,255,0.3)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
          zIndex: 10,
        }}>
          <video
            ref={localVideoRef}
            autoPlay playsInline muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {isVideoOff && (
            <div style={{
              position: 'absolute', inset: 0, background: '#12121A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24,
            }}>📷</div>
          )}
        </div>
      )}

      {/* Top bar — name + duration */}
      {callState === 'connected' && isVideo && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '50px 20px 24px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
          zIndex: 10,
        }}>
          <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 22, color: 'white', fontWeight: 600, margin: 0 }}>
            {friendName}
          </p>
          <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
            {formattedDuration} · 🔒 E2E ENCRYPTED
          </p>
        </div>
      )}

      {/* Bottom controls */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '20px 32px 44px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 20, zIndex: 10,
      }}>
        {/* Mute */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <button type="button" onClick={toggleMute} style={{
            width: 54, height: 54, borderRadius: '50%',
            background: isMuted ? '#FF006E' : 'rgba(255,255,255,0.15)',
            border: 'none', cursor: 'pointer', fontSize: 20,
            backdropFilter: 'blur(10px)',
            transition: 'background 0.2s',
          }}>
            {isMuted ? '🔇' : '🎤'}
          </button>
          <span style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>
            {isMuted ? 'UNMUTE' : 'MUTE'}
          </span>
        </div>

        {/* End call */}
        <button type="button" onClick={handleEndCall} style={{
          width: 68, height: 68, borderRadius: '50%',
          background: 'linear-gradient(135deg, #FF006E, #cc0055)',
          border: 'none', cursor: 'pointer', fontSize: 24,
          boxShadow: '0 0 28px rgba(255,0,110,0.6)',
          transition: 'transform 0.1s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.06)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          📵
        </button>

        {/* Video toggle */}
        {isVideo && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <button type="button" onClick={toggleVideo} style={{
              width: 54, height: 54, borderRadius: '50%',
              background: isVideoOff ? '#FF006E' : 'rgba(255,255,255,0.15)',
              border: 'none', cursor: 'pointer', fontSize: 20,
              backdropFilter: 'blur(10px)',
              transition: 'background 0.2s',
            }}>
              {isVideoOff ? '📷' : '📹'}
            </button>
            <span style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>
              {isVideoOff ? 'START VIDEO' : 'STOP VIDEO'}
            </span>
          </div>
        )}

        {/* Flip camera */}
        {isVideo && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <button type="button" onClick={flipCamera} style={{
              width: 54, height: 54, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              border: 'none', cursor: 'pointer', fontSize: 20,
              backdropFilter: 'blur(10px)',
            }}>
              🔄
            </button>
            <span style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>
              FLIP
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
