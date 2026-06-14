import { memo } from 'react';
import { useRouter } from 'next/router';
import Avatar from '../ui/Avatar';
import hapticTap from '../../utils/haptic';

const ChatHeader = memo(({ friend, friendStatus, theme, convId, friendId, socketConnected, showE2ETooltip, setShowE2ETooltip, showThemePicker, setShowThemePicker, e2eRef }) => {
  const router = useRouter();

  return (
    <>
      {!socketConnected && (
        <div
          className="absolute top-0 left-0 right-0 z-20 py-1 text-center font-mono text-[10px] tracking-widest"
          style={{ background: 'rgba(255,183,3,0.15)', color: '#FFB703', borderBottom: '1px solid #FFB70333' }}
        >
          ● Reconnecting...
        </div>
      )}
      <div
        className="flex items-center gap-3 px-3 py-3 flex-shrink-0"
        style={{ background: `${theme.bubble}ee`, borderBottom: `1px solid ${theme.border}`, backdropFilter: 'blur(20px)' }}
      >
        <button onClick={() => router.back()} className="p-1" style={{ color: '#6B6B8A' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        {friend && <Avatar user={friend} size={38} showStatus />}
        <div className="flex-1 min-w-0">
          <p className="font-heading font-semibold truncate" style={{ color: '#E8E8FF', fontSize: 15 }}>
            {friend?.displayName || friend?.username || '...'}
          </p>
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: friendStatus === 'online' ? '#06D6A0' : friendStatus === 'away' ? '#FFB703' : '#6B6B8A',
                boxShadow: friendStatus === 'online' ? '0 0 6px #06D6A0' : 'none',
              }}
            />
            <span className="font-mono text-[10px] tracking-widest" style={{ color: '#6B6B8A' }}>
              {friendStatus.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => { hapticTap(10); router.push(`/call/${friendId}?type=audio`); }}
            className="hud-btn px-2.5 py-1.5 rounded-sm text-xs"
            style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.25)', color: '#00F5FF' }}
          >📞</button>
          <button
            type="button"
            onClick={() => { hapticTap(10); router.push(`/call/${friendId}?type=video`); }}
            className="hud-btn px-2.5 py-1.5 rounded-sm text-xs"
            style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.25)', color: '#00F5FF' }}
          >📹</button>
          <button
            type="button"
            onClick={() => router.push('/camera')}
            className="hud-btn px-2 py-1 rounded-sm text-[10px]"
            style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.35)', color: '#00F5FF' }}
          >📸</button>
          <button
            type="button"
            onClick={() => setShowThemePicker(!showThemePicker)}
            className="hud-btn px-2 py-1 rounded-sm text-[10px]"
            style={{ background: `${theme.accent}15`, border: `1px solid ${theme.accent}55`, color: theme.accent }}
            title="Change chat theme"
          >🎨</button>
          <div className="font-mono text-[10px] tracking-widest px-2 py-1 rounded-sm" style={{ background: theme.bubble, border: `1px solid ${theme.border}`, color: '#6B6B8A' }}>
            SECURE
          </div>
          <div ref={e2eRef} className="relative">
            <button
              type="button"
              onClick={() => setShowE2ETooltip((v) => !v)}
              className="flex items-center gap-1 px-2 py-1 rounded-sm"
              style={{ background: 'rgba(6,214,160,0.08)', border: '1px solid rgba(6,214,160,0.25)' }}
              aria-label="End-to-end encryption info"
              aria-expanded={showE2ETooltip}
            >
              <svg width="10" height="12" viewBox="0 0 10 12" fill="none" aria-hidden="true" style={{ color: '#06D6A0' }}>
                <rect x="1" y="5" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <path d="M3 5V3.5C3 2.12 4.12 1 5.5 1C6.88 1 8 2.12 8 3.5V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span className="font-mono text-[8px] tracking-wider whitespace-nowrap" style={{ color: '#06D6A0' }}>
                END-TO-END ENCRYPTED
              </span>
              <svg className="e2e-shield-pulse flex-shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: '#06D6A0' }}>
                <path d="M12 2L4 6V11C4 16.5 7.8 21.2 12 22C16.2 21.2 20 16.5 20 11V6L12 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            </button>
            {showE2ETooltip && (
              <div className="e2e-tooltip" role="tooltip">
                <p className="font-mono text-[10px] leading-relaxed" style={{ color: '#E8E8FF' }}>
                  Messages are secured with AES-256 encryption. Only you and the recipient can read them.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
});

ChatHeader.displayName = 'ChatHeader';
export default ChatHeader;
