import { useRef, useCallback, memo } from 'react';
import dynamic from 'next/dynamic';
import Avatar from '../ui/Avatar';

const MessageBubble = dynamic(() => import('./MessageBubble'), {
  ssr: false,
  loading: () => <div style={{ height: 60 }} />,
});

const ChatMessages = memo(({
  messages,
  visibleRange,
  friend,
  friendTyping,
  user,
  showScrollFab,
  onReact,
  onReply,
  onDelete,
  onScroll,
  onScrollToBottom,
}) => {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    onScroll?.({
      scrollTop: el.scrollTop,
      clientHeight: el.clientHeight,
      distFromBottom,
    });
  }, [onScroll]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-3 py-2 relative"
      style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', willChange: 'scroll-position' }}
    >
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
          <span style={{ fontSize: 32 }}>🔐</span>
          <span className="font-mono text-xs" style={{ color: '#6B6B8A' }}>CHANNEL SECURE — SEND FIRST MESSAGE</span>
        </div>
      )}
      <div style={{
        paddingTop: visibleRange.start * 80,
        paddingBottom: Math.max(0, (messages.length - visibleRange.end)) * 80,
      }}>
        {messages.slice(visibleRange.start, visibleRange.end).map((msg) => (
          <MessageBubble
            key={msg._id}
            message={msg}
            isOwn={msg.sender?._id === user._id || msg.sender === user._id}
            onReact={onReact}
            onReply={onReply}
            onDelete={onDelete}
            currentUserId={user._id}
          />
        ))}
      </div>
      {friendTyping && (
        <div className="flex items-center gap-2 mb-2 animate-fade-in">
          {friend && <Avatar user={friend} size={24} />}
          <div className="px-3 py-2 rounded-sm flex items-center gap-1" style={{ background: '#1A1A26', border: '1px solid #252535' }}>
            <span className="typing-dot" style={{ width: 5, height: 5 }} />
            <span className="typing-dot" style={{ width: 5, height: 5 }} />
            <span className="typing-dot" style={{ width: 5, height: 5 }} />
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
      {showScrollFab && (
        <button
          type="button"
          onClick={() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            onScrollToBottom?.();
          }}
          className="fixed bottom-28 right-6 z-30 w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(0,245,255,0.2)',
            border: '1px solid #00F5FF',
            boxShadow: '0 0 16px rgba(0,245,255,0.4)',
            color: '#00F5FF',
          }}
          aria-label="Scroll to bottom"
        >↓</button>
      )}
    </div>
  );
});

ChatMessages.displayName = 'ChatMessages';
export default ChatMessages;
