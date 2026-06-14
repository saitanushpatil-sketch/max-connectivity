import { useRef, useState, useEffect, useCallback } from 'react';

const useWebRTC = ({ socket, currentUser, targetUser, onCallEnd }) => {
  const [callState, setCallState] = useState('idle'); // idle | calling | incoming | connected
  const [isVideo, setIsVideo] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [incomingCall, setIncomingCall] = useState(null);
  const [connectionQuality, setConnectionQuality] = useState('good');

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pendingCandidates = useRef([]);
  const timerRef = useRef(null);
  const callStartTime = useRef(null);
  const qualityIntervalRef = useRef(null);

  const getICEServers = async () => {
    try {
      const API = process.env.NEXT_PUBLIC_API_URL;
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/ice-config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.iceServers;
    } catch {
      return [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
      ];
    }
  };

  const cleanup = useCallback((notify = false) => {
    clearInterval(timerRef.current);
    clearInterval(qualityIntervalRef.current);
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallState('idle');
    setDuration(0);
    setIsMuted(false);
    setIsCamOff(false);
    setIncomingCall(null);
    pendingCandidates.current = [];
    callStartTime.current = null;
    if (notify) onCallEnd?.();
  }, [onCallEnd]);

  const createPeerConnection = useCallback(async (targetId) => {
    const iceServers = await getICEServers();
    const pc = new RTCPeerConnection({ iceServers, iceCandidatePoolSize: 10 });

    pc.onicecandidate = (e) => {
      if (e.candidate && socket?.connected) {
        socket.emit('call:ice-candidate', { to: targetId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('WebRTC state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallState('connected');
        callStartTime.current = Date.now();
        timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      }
      if (['failed', 'disconnected'].includes(pc.connectionState)) {
        pc.restartIce();
      }
      if (pc.connectionState === 'closed') {
        cleanup(true);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') pc.restartIce();
    };

    // Monitor connection quality
    qualityIntervalRef.current = setInterval(async () => {
      if (!pc || pc.connectionState !== 'connected') {
        clearInterval(qualityIntervalRef.current);
        return;
      }
      try {
        const stats = await pc.getStats();
        stats.forEach((report) => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            const rtt = report.currentRoundTripTime;
            if (rtt < 0.1) setConnectionQuality('excellent');
            else if (rtt < 0.3) setConnectionQuality('good');
            else setConnectionQuality('poor');
          }
        });
      } catch {}
    }, 5000);

    return pc;
  }, [socket, cleanup]);

  const getMedia = async (video) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
      },
      video: video
        ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user', frameRate: { ideal: 30 } }
        : false,
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  };

  const startCall = useCallback(async (video = true) => {
    if (!targetUser?._id) return;
    try {
      setIsVideo(video);
      setCallState('calling');
      const stream = await getMedia(video);
      const pc = await createPeerConnection(targetUser._id);
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: video,
      });
      await pc.setLocalDescription(offer);
      socket.emit('call:initiate', {
        to: targetUser._id,
        offer,
        callType: video ? 'video' : 'audio',
        callerName: currentUser?.displayName || currentUser?.username,
        callerAvatar: currentUser?.avatarColor,
      });
    } catch (err) {
      console.error('startCall error:', err);
      cleanup();
    }
  }, [targetUser, currentUser, socket, createPeerConnection, cleanup]);

  const answerCall = useCallback(async () => {
    if (!incomingCall) return;
    try {
      const video = incomingCall.callType === 'video';
      setIsVideo(video);
      const stream = await getMedia(video);
      const pc = await createPeerConnection(incomingCall.from);
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      for (const c of pendingCandidates.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      }
      pendingCandidates.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('call:answer', { to: incomingCall.from, answer });
      setCallState('connected');
      callStartTime.current = Date.now();
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err) {
      console.error('answerCall error:', err);
      cleanup();
    }
  }, [incomingCall, createPeerConnection, socket, cleanup]);

  const rejectCall = useCallback(() => {
    if (incomingCall) socket?.emit('call:reject', { to: incomingCall.from });
    setIncomingCall(null);
    setCallState('idle');
  }, [incomingCall, socket]);

  const endCall = useCallback(() => {
    const targetId = targetUser?._id || incomingCall?.from;
    const dur = callStartTime.current ? Math.floor((Date.now() - callStartTime.current) / 1000) : 0;
    if (targetId) socket?.emit('call:end', { to: targetId, duration: dur });
    cleanup(true);
  }, [targetUser, incomingCall, socket, cleanup]);

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((m) => !m);
  }, []);

  const toggleCam = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsCamOff((c) => !c);
  }, []);

  const flipCamera = useCallback(async () => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;
    const settings = videoTrack.getSettings();
    const newFacing = settings.facingMode === 'user' ? 'environment' : 'user';
    videoTrack.stop();

    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: newFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    const newVideoTrack = newStream.getVideoTracks()[0];

    if (pcRef.current) {
      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
      await sender?.replaceTrack(newVideoTrack);
    }

    localStreamRef.current.removeTrack(videoTrack);
    localStreamRef.current.addTrack(newVideoTrack);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, []);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onIncoming = (data) => {
      setIncomingCall(data);
      setCallState('incoming');
    };

    const onAnswered = async ({ answer }) => {
      if (!pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        for (const c of pendingCandidates.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        pendingCandidates.current = [];
      } catch (err) {
        console.error('onAnswered error:', err);
      }
    };

    const onICECandidate = async ({ candidate }) => {
      if (!candidate) return;
      if (pcRef.current?.remoteDescription) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      } else {
        pendingCandidates.current.push(candidate);
      }
    };

    const onEnded = () => cleanup(true);
    const onRejected = () => {
      cleanup();
    };
    const onBusy = () => {
      cleanup();
    };
    const onUnavailable = () => {
      cleanup();
    };

    socket.on('call:incoming', onIncoming);
    socket.on('call:answered', onAnswered);
    socket.on('call:ice-candidate', onICECandidate);
    socket.on('call:ended', onEnded);
    socket.on('call:rejected', onRejected);
    socket.on('call:busy', onBusy);
    socket.on('call:unavailable', onUnavailable);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:answered', onAnswered);
      socket.off('call:ice-candidate', onICECandidate);
      socket.off('call:ended', onEnded);
      socket.off('call:rejected', onRejected);
      socket.off('call:busy', onBusy);
      socket.off('call:unavailable', onUnavailable);
    };
  }, [socket, cleanup]);

  useEffect(() => () => cleanup(), [cleanup]);

  return {
    callState,
    isVideo,
    isMuted,
    isCamOff,
    duration,
    incomingCall,
    connectionQuality,
    localVideoRef,
    remoteVideoRef,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCam,
    flipCamera,
  };
};

export default useWebRTC;
