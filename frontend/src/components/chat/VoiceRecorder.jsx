import { useState, useRef, useCallback, memo } from 'react';
import hapticTap from '../../utils/haptic';

const VoiceRecorder = memo(({ onSend }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result;
          if (base64 && audioChunksRef.current.length > 0) {
            onSend(base64, duration);
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      hapticTap(15);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch {
      // Microphone access denied
    }
  }, [onSend, duration]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerRef.current);
    setIsRecording(false);
    hapticTap(10);
  }, []);

  if (isRecording) {
    return (
      <button
        onClick={stop}
        className="w-9 h-9 flex items-center justify-center rounded-sm flex-shrink-0 transition-all"
        style={{
          background: 'rgba(255,0,110,0.2)',
          border: '1px solid #FF006E',
          boxShadow: '0 0 12px rgba(255,0,110,0.4)',
          color: '#FF006E',
          animation: 'pulse 1s infinite',
        }}
        title={`Stop recording (${duration}s)`}
      >
        ⬛
      </button>
    );
  }

  return (
    <button
      onClick={start}
      className="w-9 h-9 flex items-center justify-center rounded-sm flex-shrink-0 transition-all"
      style={{
        background: '#1A1A26',
        border: '1px solid #252535',
        fontSize: 14,
        color: '#6B6B8A',
      }}
      title="Record voice message"
    >
      🎙️
    </button>
  );
});

VoiceRecorder.displayName = 'VoiceRecorder';
export default VoiceRecorder;
