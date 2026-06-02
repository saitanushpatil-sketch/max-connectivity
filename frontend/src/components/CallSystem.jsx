import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turns:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
];

export default function CallSystem({ socket, currentUser, targetUser, onClose }) {
  const [callState, setCallState] = useState('idle'); // idle | calling | incoming | connected
  const [isVideo, setIsVideo] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [incomingCall, setIncomingCall] = useState(null);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const timerRef = useRef(null);
  const pendingCandidates = useRef([]);

  // Timer
  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [callState]);

  const formatDuration = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    clearInterval(timerRef.current);
    setCallState('idle');
    setCallDuration(0);
    pendingCandidates.current = [];
  }, []);

  const createPC = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceCandidatePoolSize: 10 });

    pc.onicecandidate = (e) => {
      if (e.candidate && socket) {
        socket.emit('call:ice-candidate', {
          to: targetUser?._id || incomingCall?.from,
          candidate: e.candidate
        });
      }
    };

    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setCallState('connected');
      if (['failed','disconnected','closed'].includes(pc.connectionState)) {
        cleanup();
        onClose?.();
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') pc.restartIce();
    };

    return pc;
  }, [socket, targetUser, incomingCall, cleanup, onClose]);

  const getMedia = async (video = true) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      video: video ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  };

  const startCall = async (video = true) => {
    try {
      setIsVideo(video);
      setCallState('calling');
      const stream = await getMedia(video);
      const pc = createPC();
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: video });
      await pc.setLocalDescription(offer);
      socket.emit('call:initiate', {
        to: targetUser._id,
        from: currentUser._id,
        offer,
        callType: video ? 'video' : 'audio',
        callerName: currentUser.username,
        callerAvatar: currentUser.avatar,
      });
    } catch (err) {
      console.error('Start call error:', err);
      alert('Camera/mic access denied: ' + err.message);
      cleanup();
    }
  };

  const answerCall = async () => {
    try {
      const { offer, callType } = incomingCall;
      const video = callType === 'video';
      setIsVideo(video);
      setCallState('connected');
      const stream = await getMedia(video);
      const pc = createPC();
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      // Add any pending candidates
      for (const c of pendingCandidates.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      }
      pendingCandidates.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('call:answer', { to: incomingCall.from, answer });
    } catch (err) {
      console.error('Answer call error:', err);
      cleanup();
    }
  };

  const rejectCall = () => {
    socket.emit('call:reject', { to: incomingCall?.from });
    setIncomingCall(null);
    setCallState('idle');
  };

  const endCall = () => {
    socket.emit('call:end', { to: targetUser?._id || incomingCall?.from });
    cleanup();
    onClose?.();
  };

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(m => !m);
  };

  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsCamOff(c => !c);
  };

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('call:incoming', (data) => {
      setIncomingCall(data);
      setCallState('incoming');
    });

    socket.on('call:answered', async ({ answer }) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        for (const c of pendingCandidates.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(c));
        }
        pendingCandidates.current = [];
      }
    });

    socket.on('call:ice-candidate', async ({ candidate }) => {
      if (!candidate) return;
      if (pcRef.current?.remoteDescription) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        pendingCandidates.current.push(candidate);
      }
    });

    socket.on('call:ended', () => { cleanup(); onClose?.(); });
    socket.on('call:rejected', () => { cleanup(); alert('Call rejected'); onClose?.(); });

    return () => {
      socket.off('call:incoming');
      socket.off('call:answered');
      socket.off('call:ice-candidate');
      socket.off('call:ended');
      socket.off('call:rejected');
    };
  }, [socket, cleanup, onClose]);

  useEffect(() => () => cleanup(), []);

  const btnStyle = (color = '#00F5FF') => ({
    width: 56, height: 56, borderRadius: '50%', border: `2px solid ${color}`,
    background: `${color}22`, color, fontSize: 22, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: `0 0 16px ${color}44`,
  });

  return (
    <>
      {/* Incoming call UI */}
      <AnimatePresence>
        {callState === 'incoming' && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            style={{
              position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(10,10,15,0.97)', border: '1px solid #00F5FF44',
              borderRadius: 20, padding: '20px 28px', zIndex: 9999,
              backdropFilter: 'blur(20px)', minWidth: 300, textAlign: 'center',
              boxShadow: '0 0 40px #00F5FF22',
            }}
          >
            <div style={{ fontSize: 13, color: '#00F5FF', letterSpacing: 2, marginBottom: 8 }}>
              INCOMING {incomingCall?.callType?.toUpperCase()} CALL
            </div>
            <div style={{ fontSize: 18, color: '#E8E8FF', fontWeight: 600, marginBottom: 20 }}>
              {incomingCall?.callerName}
            </div>
            <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
              <button onClick={rejectCall} style={btnStyle('#FF006E')}>✕</button>
              <button onClick={answerCall} style={btnStyle('#06D6A0')}>✓</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active call UI */}
      <AnimatePresence>
        {['calling','connected'].includes(callState) && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: '#0A0A0F',
              zIndex: 9998, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {/* Remote video */}
            <video ref={remoteVideoRef} autoPlay playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
            />

            {/* Local video (PiP) */}
            <video ref={localVideoRef} autoPlay playsInline muted
              style={{
                position: 'absolute', bottom: 100, right: 16,
                width: 100, height: 140, objectFit: 'cover',
                borderRadius: 12, border: '2px solid #00F5FF44',
                zIndex: 2,
              }}
            />

            {/* Status */}
            <div style={{
              position: 'absolute', top: 40, left: 0, right: 0,
              textAlign: 'center', zIndex: 3,
            }}>
              <div style={{ fontSize: 13, color: '#00F5FF', letterSpacing: 2 }}>
                {callState === 'calling' ? 'CONNECTING...' : formatDuration(callDuration)}
              </div>
              <div style={{ fontSize: 20, color: '#E8E8FF', fontWeight: 600, marginTop: 4 }}>
                {targetUser?.username}
              </div>
            </div>

            {/* Controls */}
            <div style={{
              position: 'absolute', bottom: 40, left: 0, right: 0,
              display: 'flex', justifyContent: 'center', gap: 20, zIndex: 3,
            }}>
              <button onClick={toggleMute} style={btnStyle(isMuted ? '#FF006E' : '#00F5FF')}>
                {isMuted ? '🔇' : '🎤'}
              </button>
              <button onClick={endCall} style={{ ...btnStyle('#FF006E'), width: 64, height: 64, fontSize: 26 }}>
                📵
              </button>
              {isVideo && (
                <button onClick={toggleCam} style={btnStyle(isCamOff ? '#FF006E' : '#00F5FF')}>
                  {isCamOff ? '📷' : '📹'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Call buttons (shown in chat header) */}
      {callState === 'idle' && targetUser && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => startCall(false)} style={btnStyle('#06D6A0')} title="Audio call">📞</button>
          <button onClick={() => startCall(true)} style={btnStyle('#00F5FF')} title="Video call">📹</button>
        </div>
      )}
    </>
  );
}
