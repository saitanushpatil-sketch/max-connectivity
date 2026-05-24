import { useRef, useState, useCallback, useEffect } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10,
};

export default function useWebRTC({ socket, localVideoRef, remoteVideoRef }) {
  const pc = useRef(null);
  const localStream = useRef(null);
  const [callState, setCallState] = useState('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callError, setCallError] = useState(null);
  const timerRef = useRef(null);
  const remoteUserId = useRef(null);
  const pendingCandidates = useRef([]);

  const cleanup = useCallback(() => {
    localStream.current?.getTracks().forEach((t) => t.stop());
    pc.current?.close();
    pc.current = null;
    localStream.current = null;
    if (localVideoRef?.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef?.current) remoteVideoRef.current.srcObject = null;
    clearInterval(timerRef.current);
    timerRef.current = null;
    pendingCandidates.current = [];
    setCallState('idle');
    setCallDuration(0);
    setCallError(null);
    setIsMuted(false);
    setIsVideoOff(false);
    remoteUserId.current = null;
  }, [localVideoRef, remoteVideoRef]);

  const createPC = useCallback(() => {
    const peerConnection = new RTCPeerConnection(ICE_SERVERS);

    peerConnection.onicecandidate = ({ candidate }) => {
      if (candidate && remoteUserId.current && socket) {
        socket.emit('call:ice', { to: remoteUserId.current, candidate });
      }
    };

    peerConnection.ontrack = ({ streams }) => {
      if (remoteVideoRef?.current && streams[0]) {
        remoteVideoRef.current.srcObject = streams[0];
        remoteVideoRef.current.play?.()?.catch(() => {});
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'connected') {
        setCallState('connected');
        if (!timerRef.current) {
          timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
        }
      }
      if (['disconnected', 'failed', 'closed'].includes(peerConnection.connectionState)) {
        cleanup();
      }
    };

    return peerConnection;
  }, [socket, remoteVideoRef, cleanup]);

  const getMedia = async (callType) => {
    try {
      const constraints = callType === 'video'
        ? { video: { facingMode: 'user', width: 640, height: 480 }, audio: true }
        : { video: false, audio: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStream.current = stream;
      if (localVideoRef?.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      setCallError('Could not access camera/microphone. Please allow permissions.');
      throw err;
    }
  };

  const startCall = useCallback(async (friendId, callType = 'video') => {
    try {
      remoteUserId.current = friendId;
      setCallState('calling');

      const stream = await getMedia(callType);
      const peerConnection = createPC();
      pc.current = peerConnection;

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
      });
      await peerConnection.setLocalDescription(offer);

      socket.emit('call:initiate', {
        to: friendId,
        offer: peerConnection.localDescription,
        callType,
      });
    } catch (err) {
      cleanup();
      if (!callError) setCallError('Failed to establish connection.');
    }
  }, [createPC, cleanup, socket]);

  const answerCall = useCallback(async (callerId, incomingOffer, callType) => {
    try {
      remoteUserId.current = callerId;
      setCallState('connected');

      const stream = await getMedia(callType);
      const peerConnection = createPC();
      pc.current = peerConnection;

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      await peerConnection.setRemoteDescription(new RTCSessionDescription(incomingOffer));

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit('call:answer', {
        to: callerId,
        answer: peerConnection.localDescription,
      });

      while (pendingCandidates.current.length > 0) {
        const candidate = pendingCandidates.current.shift();
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      }

      if (!timerRef.current) {
        timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
      }
    } catch (err) {
      cleanup();
      if (!callError) setCallError('Failed to answer call.');
    }
  }, [createPC, cleanup, socket]);

  const handleIceCandidate = useCallback(async (candidate) => {
    try {
      if (pc.current?.remoteDescription) {
        await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        pendingCandidates.current.push(candidate);
      }
    } catch (err) {
    }
  }, []);

  const handleAnswer = useCallback(async (answer) => {
    try {
      if (pc.current && !pc.current.currentRemoteDescription) {
        await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
        while (pendingCandidates.current.length > 0) {
          const candidate = pendingCandidates.current.shift();
          await pc.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        }
        setCallState('connected');
        if (!timerRef.current) {
          timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
        }
      }
    } catch (err) {
    }
  }, []);

  const endCall = useCallback((friendId) => {
    if (friendId || remoteUserId.current) {
      socket.emit('call:end', { to: friendId || remoteUserId.current });
    }
    cleanup();
  }, [socket, cleanup]);

  const rejectCall = useCallback((callerId) => {
    socket.emit('call:reject', { to: callerId });
    cleanup();
  }, [socket, cleanup]);

  const toggleMute = useCallback(() => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, []);

  const flipCamera = useCallback(async () => {
    if (!localStream.current) return;
    const videoTrack = localStream.current.getVideoTracks()[0];
    if (!videoTrack) return;
    const currentFacing = videoTrack.getSettings().facingMode;
    const newFacing = currentFacing === 'user' ? 'environment' : 'user';

    videoTrack.stop();
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: newFacing },
      audio: false,
    });
    const newVideoTrack = newStream.getVideoTracks()[0];

    if (pc.current) {
      const sender = pc.current.getSenders().find((s) => s.track?.kind === 'video');
      await sender?.replaceTrack(newVideoTrack);
    }

    localStream.current.removeTrack(videoTrack);
    localStream.current.addTrack(newVideoTrack);
    if (localVideoRef?.current) {
      localVideoRef.current.srcObject = localStream.current;
    }
  }, [localVideoRef]);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => () => cleanup(), [cleanup]);

  return {
    callState,
    isMuted,
    isVideoOff,
    callDuration,
    callError,
    setCallError,
    formattedDuration: formatDuration(callDuration),
    startCall,
    answerCall,
    endCall,
    rejectCall,
    handleIceCandidate,
    handleAnswer,
    toggleMute,
    toggleVideo,
    flipCamera,
    cleanup,
  };
}
