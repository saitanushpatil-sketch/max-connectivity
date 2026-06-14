import { useRef, useCallback, memo, useState } from 'react';
import dynamic from 'next/dynamic';
import hapticTap from '../../utils/haptic';
import VoiceRecorder from './VoiceRecorder';

const GifPanel = dynamic(() => import('../meme/GifPanel'), {
  ssr: false,
  loading: () => <div style={{ height: '65vh', background: '#0D0D14' }} />,
});

const MESSAGE_MAX_LENGTH = 2000;

const ChatInput = memo(({
  convId,
  friendId,
  user,
  theme,
  replyTo,
  setReplyTo,
  disappearAfter,
  setDisappearAfter,
  suggestedMemes,
  setSuggestedMemes,
  onSendText,
  onSendGif,
  onSendVoice,
  onInputChange,
  onEditorTemplate,
  sending,
}) => {
  const inputRef = useRef(null);
  const [showMemePanel, setShowMemePanel] = useState(false);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const val = inputRef.current?.value || '';
      if (val.trim()) {
        onSendText(val.trim());
        if (inputRef.current) inputRef.current.value = '';
      }
    }
  }, [onSendText]);

  const handleSendClick = useCallback(() => {
    const val = inputRef.current?.value || '';
    if (val.trim()) {
      onSendText(val.trim());
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [onSendText]);

  const handleGifSelect = useCallback((item) => {
    setShowMemePanel(false);
    onSendGif(item);
  }, [onSendGif]);

  return (
    <div className="flex-shrink-0" style={{ background: theme.bg, borderTop: `1px solid ${theme.border}` }}>
      {/* Reply strip */}
      {replyTo && (
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ background: '#12121A', borderBottom: '1px solid #252535' }}
        >
          <div className="w-0.5 h-8 rounded-full flex-shrink-0" style={{ background: '#00F5FF' }} />
          <div className="flex-1 min-w-0">
            <span className="font-mono text-[10px] tracking-widest" style={{ color: '#00F5FF' }}>REPLY</span>
            <p className="text-xs truncate mt-0.5" style={{ color: '#6B6B8A' }}>{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} style={{ color: '#6B6B8A', fontSize: 16 }}>✕</button>
        </div>
      )}

      {/* Meme suggestions */}
      {suggestedMemes.length > 0 && (
        <div className="flex gap-2 px-3 py-2 overflow-x-auto bg-[#12121A] border-b border-[#252535]" style={{ scrollbarWidth: 'none' }}>
          {suggestedMemes.map(meme => (
            <button
              key={meme._id}
              onClick={() => { setSuggestedMemes([]); onEditorTemplate(meme); }}
              className="flex-shrink-0 relative w-16 h-16 rounded-md overflow-hidden border border-[#252535] bg-[#0A0A0F]"
            >
              <img src={meme.url} alt={meme.name} className="w-full h-full object-cover opacity-70 hover:opacity-100 transition-opacity" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {/* GIF Panel */}
      {showMemePanel && (
        <GifPanel onSelect={handleGifSelect} onClose={() => setShowMemePanel(false)} />
      )}

      <div className="flex items-center gap-2 px-3 py-3">
        {/* Meme button */}
        <button
          onClick={() => { setShowMemePanel(!showMemePanel); inputRef.current?.focus(); }}
          className="w-9 h-9 flex items-center justify-center rounded-sm flex-shrink-0 transition-all"
          style={{
            background: showMemePanel ? 'rgba(0,245,255,0.15)' : '#1A1A26',
            border: `1px solid ${showMemePanel ? '#00F5FF' : '#252535'}`,
            fontSize: 18,
          }}
        >🎭</button>

        {/* Disappearing messages toggle */}
        <button
          onClick={() => {
            hapticTap(6);
            const cycle = { 0: 24, 24: 168, 168: 0 };
            setDisappearAfter(prev => cycle[prev] ?? 0);
          }}
          className="w-9 h-9 flex items-center justify-center rounded-sm flex-shrink-0 transition-all"
          style={{
            background: disappearAfter ? 'rgba(255,183,3,0.12)' : '#1A1A26',
            border: `1px solid ${disappearAfter ? 'rgba(255,183,3,0.5)' : '#252535'}`,
            fontSize: 14,
            color: disappearAfter ? '#FFB703' : '#6B6B8A',
          }}
          title={disappearAfter ? `Messages disappear in ${disappearAfter}h` : 'Disappearing messages off'}
        >⏱</button>

        {/* Text input */}
        <div className="flex-1 min-w-0 flex flex-col">
          {disappearAfter > 0 && (
            <div className="font-mono text-[8px] tracking-widest mb-1 px-1" style={{ color: '#FFB703' }}>
              ⏱ DISAPPEAR: {disappearAfter === 24 ? '24H' : '7D'}
            </div>
          )}
          <input
            ref={inputRef}
            className="hud-input w-full px-3 py-2.5 rounded-sm text-sm"
            placeholder="TRANSMIT MESSAGE..."
            defaultValue=""
            onChange={onInputChange}
            onKeyDown={handleKeyDown}
            maxLength={MESSAGE_MAX_LENGTH}
            style={{ fontSize: 14 }}
          />
        </div>

        {/* Voice recorder */}
        <VoiceRecorder onSend={onSendVoice} />

        {/* Send button */}
        <button
          onClick={handleSendClick}
          disabled={sending}
          className="w-9 h-9 flex items-center justify-center rounded-sm flex-shrink-0 transition-all"
          style={{
            background: 'rgba(0,245,255,0.15)',
            border: '1px solid #00F5FF',
            color: '#00F5FF',
            fontSize: 14,
            opacity: sending ? 0.5 : 1,
          }}
        >➤</button>
      </div>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';
export default ChatInput;
