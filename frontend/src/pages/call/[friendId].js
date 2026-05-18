import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import useAuthStore from '../../context/authStore';
import useCallStore from '../../context/callStore';
import useWebRTC from '../../hooks/useWebRTC';
import { getSocket } from '../../hooks/useSocket';
import api from '../../utils/api';

export default function CallPage() {
  const router = useRouter();
  const { friendId } = router.query;
  const { incomingCall, clearIncomingCall } = useCallStore();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [friend, setFriend] = useState(null);
  const socket = getSocket();
  const initiatedRef = useRef(false);

  const {
    callState, isMuted, isVideoOff,
    formattedDuration,
    startCall, answerCall, endCall,
    handleIceCandidate, handleAnswer,
    toggleMute, toggleVideo, flipCamera,
  } = useWebRTC({ socket, localVideoRef, remoteVideoRef });

  useEffect(() => {
    if (!friendId) return;
    api.get(`/users/${friendId}`).then((r) => setFriend(r.data.user || r.data)).catch(() => {});
  }, [friendId]);

  useEffect(() => {
    if (!friendId || !socket || initiatedRef.current) return;
    initiatedRef.current = true;
    const callType = router.query.type || 'video';

    if (incomingCall) {
      answerCall(incomingCall.from, incomingCall.offer, incomingCall.callType || callType);
      clearIncomingCall();
    } else {
      startCall(friendId, callType);
    }
  }, [friendId, socket, incomingCall, router.query.type, answerCall, clearIncomingCall, startCall]);

  useEffect(() => {
    if (!socket) return;

    const onAnswered = ({ answer }) => handleAnswer(answer);
    const onIce = ({ candidate }) => handleIceCandidate(candidate);
    const onEnded = () => router.back();
    const onRejected = () => {
      if (typeof window !== 'undefined') window.alert('Call rejected');
      router.back();
    };

    socket.on('call:answered', onAnswered);
    socket.on('call:ice', onIce);
    socket.on('call:ended', onEnded);
    socket.on('call:rejected', onRejected);

    return () => {
      socket.off('call:answered', onAnswered);
      socket.off('call:ice', onIce);
      socket.off('call:ended', onEnded);
      socket.off('call:rejected', onRejected);
    };
  }, [socket, handleAnswer, handleIceCandidate, router]);

  const handleEndCall = () => {
    endCall(friendId);
    router.back();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0A0A0F',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', zIndex: 9998,
    }}>
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          background: '#12121A',
        }}
      />

      {callState !== 'connected' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#0A0A0F',
          gap: 16,
        }}>
          <div style={{
            width: 100, height: 100, borderRadius: 8,
            background: `${friend?.avatarColor || '#00F5FF'}22`,
            border: `2px solid ${friend?.avatarColor || '#00F5FF'}`,
            display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            fontSize: 36, color: friend?.avatarColor || '#00F5FF',
            fontFamily: 'Rajdhani, sans-serif', fontWeight: 700,
          }}>
            {(friend?.displayName || friend?.username || '?')[0].toUpperCase()}
          </div>
          <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 24, color: '#E8E8FF', fontWeight: 600 }}>
            {friend?.displayName || 'Calling...'}
          </p>
          <p style={{
            fontFamily: 'Share Tech Mono, monospace', fontSize: 12,
            color: '#6B6B8A', animation: 'pulse 1.5s infinite',
          }}>
            {callState === 'calling' ? 'RINGING...' : callState === 'connected' ? 'CONNECTED' : 'CONNECTING...'}
          </p>
        </div>
      )}

      <div style={{
        position: 'absolute', bottom: 100, right: 16,
        width: 100, height: 140, borderRadius: 12,
        overflow: 'hidden', border: '2px solid #00F5FF44',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        zIndex: 10,
      }}>
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {isVideoOff && (
          <div style={{
            position: 'absolute', inset: 0,
            background: '#12121A',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 24,
          }}>
            📷
          </div>
        )}
      </div>

      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '50px 20px 20px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', zIndex: 10,
      }}>
        <div>
          <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 20, color: 'white', fontWeight: 600, margin: 0 }}>
            {friend?.displayName || '...'}
          </p>
          <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
            {callState === 'connected' ? formattedDuration : callState.toUpperCase()}
          </p>
        </div>
        <span style={{
          fontFamily: 'Share Tech Mono, monospace', fontSize: 10,
          color: '#06D6A0', padding: '3px 8px',
          border: '1px solid #06D6A044', borderRadius: 4,
        }}>
          🔒 E2E ENCRYPTED
        </span>
      </div>

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '20px 24px 40px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 20, zIndex: 10,
      }}>
        <button type="button" onClick={toggleMute} style={{
          width: 56, height: 56, borderRadius: '50%',
          background: isMuted ? '#FF006E' : 'rgba(255,255,255,0.15)',
          border: 'none', cursor: 'pointer', fontSize: 22,
          backdropFilter: 'blur(10px)',
        }}>
          {isMuted ? '🔇' : '🎤'}
        </button>
        <button type="button" onClick={handleEndCall} style={{
          width: 70, height: 70, borderRadius: '50%',
          background: 'linear-gradient(135deg, #FF006E, #cc0055)',
          border: 'none', cursor: 'pointer', fontSize: 26,
          boxShadow: '0 0 25px rgba(255,0,110,0.6)',
        }}>
          📵
        </button>
        <button type="button" onClick={toggleVideo} style={{
          width: 56, height: 56, borderRadius: '50%',
          background: isVideoOff ? '#FF006E' : 'rgba(255,255,255,0.15)',
          border: 'none', cursor: 'pointer', fontSize: 22,
          backdropFilter: 'blur(10px)',
        }}>
          {isVideoOff ? '📷' : '📹'}
        </button>
        <button type="button" onClick={flipCamera} style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          border: 'none', cursor: 'pointer', fontSize: 22,
          backdropFilter: 'blur(10px)',
        }}>
          🔄
        </button>
      </div>
    </div>
  );
}
