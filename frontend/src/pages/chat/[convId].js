import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import useAuthStore from '../../context/authStore';
import useSocket from '../../hooks/useSocket';
import Avatar from '../../components/ui/Avatar';
import api from '../../utils/api';
import useToast from '../../hooks/useToast';
import hapticTap from '../../utils/haptic';

const MessageBubble = dynamic(() => import('../../components/chat/MessageBubble'), {
  ssr: false,
  loading: () => <div style={{ height: 60 }} />
});

const MemeEditor = dynamic(() => import('../../components/meme/MemeEditor'), { ssr: false });

const GifPanel = dynamic(() => import('../../components/meme/GifPanel'), {
  ssr: false,
  loading: () => <div style={{ height: '65vh', background: '#0D0D14' }} />
});

const buildConvId = (a, b) => [a, b].sort().join('_');
const MESSAGE_MAX_LENGTH = 2000;

const LOCAL_MEMES = [
  ...['mahesh-babu-pointing', 'allu-arjun-pushpa', 'pawan-kalyan-serious', 'ntr-angry', 'brahmanandam-reaction', 'venkatesh-surprised'].map(n => ({ _id: n, name: n.replace(/-/g, ' ').toUpperCase(), url: `/memes/${n}.svg`, category: 'Telugu', isTemplate: true })),
  ...['srk-arms-open', 'ranveer-screaming', 'akshay-salute', 'amitabh-pointing'].map(n => ({ _id: n, name: n.replace(/-/g, ' ').toUpperCase(), url: `/memes/${n}.svg`, category: 'Hindi', isTemplate: true })),
  ...['drake-approve', 'distracted-boyfriend', 'this-is-fine', 'surprised-pikachu', 'two-buttons', 'gru-plan', 'stonks', 'brain-expanding', 'panik-kalm', 'gigachad'].map(n => ({ _id: n, name: n.replace(/-/g, ' ').toUpperCase(), url: `/memes/${n}.svg`, category: 'Internet', isTemplate: true }))
];



export default function ChatPage() {
  const router = useRouter();
  const { convId } = router.query;
  const { user } = useAuthStore();

  const [friend, setFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [showMemePanel, setShowMemePanel] = useState(false);
  const [editorTemplate, setEditorTemplate] = useState(null);
  const [suggestedMemes, setSuggestedMemes] = useState([]);
  const [imgflipMemes, setImgflipMemes] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [friendTyping, setFriendTyping] = useState(false);
  const [friendStatus, setFriendStatus] = useState('offline');

  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const lastTypingEmitRef = useRef(0);
  const inputRef = useRef(null);
  const e2eRef = useRef(null);
  const [showE2ETooltip, setShowE2ETooltip] = useState(false);
  const [showScrollFab, setShowScrollFab] = useState(false);
  const [socketConnected, setSocketConnected] = useState(true);
  const messagesContainerRef = useRef(null);
  const { toast } = useToast();
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });

  // Derive friendId from convId
  const friendId = convId ? convId.split('_').find((id) => id !== user?._id) : null;

  const fetchFriend = async (fid) => {
    try {
      const { data } = await api.get(`/users/${fid}`);
      setFriend(data.user);
      setFriendStatus(data.user.status);
    } catch (_) {}
  };

  const fetchMessages = async (pg = 1) => {
    if (!convId) return;
    try {
      const { data } = await api.get(`/messages/${convId}?page=${pg}`);
      if (pg === 1) {
        setMessages(data.messages || []);
      } else {
        setMessages((prev) => [...(data.messages || []), ...prev]);
      }
      setHasMore(data.pagination?.hasMore || false);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => {
    if (!convId || !user) return;
    fetchFriend(friendId);
    fetchMessages(1);
    // Fetch Imgflip templates
    fetch('https://api.imgflip.com/get_memes')
      .then(r => r.json())
      .then(d => {
        if (d.success) setImgflipMemes(d.data.memes.map(m => ({
          _id: m.id,
          name: m.name.toUpperCase(),
          url: m.url,
          category: 'Imgflip',
          isTemplate: true
        })));
      })
      .catch(() => {});
  }, [convId, user]);

  const { joinConversation, sendMessage, emitTypingStart, emitTypingStop, reactMessage, markRead } = useSocket({
    onConnect: () => setSocketConnected(true),
    onDisconnect: () => setSocketConnected(false),
    onReceiveMessage: ({ message }) => {
      if (message.conversationId !== convId) return;
      setMessages((prev) => {
        // Replace optimistic OR skip duplicate
        const hasOptimistic = prev.some((m) => m._optimistic && m.type === message.type && m.content === message.content);
        if (hasOptimistic) return prev.map((m) => m._optimistic && m.content === message.content ? message : m);
        if (prev.some((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    },
    onUserTyping: ({ conversationId, userId }) => {
      if (conversationId === convId && userId === friendId) setFriendTyping(true);
    },
    onUserStopTyping: ({ conversationId, userId }) => {
      if (conversationId === convId && userId === friendId) setFriendTyping(false);
    },
    onUserStatus: ({ userId, status }) => {
      if (userId === friendId) setFriendStatus(status);
    },
    onMessageReacted: ({ messageId, reactions }) => {
      setMessages((prev) => prev.map((m) => m._id === messageId ? { ...m, reactions } : m));
    },
    onMessagesRead: ({ conversationId }) => {
      if (conversationId !== convId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.sender?._id === user._id ? { ...m, readBy: [...(m.readBy || []), friendId] } : m
        )
      );
    },
  });

  useEffect(() => {
    if (convId) {
      joinConversation(convId);
      if (friendId) markRead(convId, friendId);
    }
  }, [convId, friendId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages.length, loading]);

  useEffect(() => {
    if (!showE2ETooltip) return;
    const handleOutside = (e) => {
      if (e2eRef.current && !e2eRef.current.contains(e.target)) {
        setShowE2ETooltip(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [showE2ETooltip]);

  const handleSendText = useCallback(async () => {
    const val = inputRef.current?.value || '';
    if (!val.trim() || sending) return;
    const content = val.trim();
    hapticTap(10);
    if (inputRef.current) inputRef.current.value = '';
    setReplyTo(null);
    setShowMemePanel(false);
    setSending(true);
    emitTypingStop(convId, friendId);

    // Optimistic message
    const tempMsg = {
      _id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId: convId,
      sender: { _id: user._id, username: user.username, displayName: user.displayName, avatarColor: user.avatarColor },
      type: 'text',
      content,
      replyTo: replyTo || null,
      reactions: [],
      readBy: [user._id],
      createdAt: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'instant' }), 10);

    try {
      const response = await sendMessage({
        conversationId: convId,
        receiverId: friendId,
        content,
        type: 'text',
        replyTo: replyTo?._id || null,
      });
      setMessages((prev) =>
        prev.map((m) => m._id === tempMsg._id ? response.message : m)
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m._id !== tempMsg._id));
      if (inputRef.current) inputRef.current.value = content;
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  }, [sending, convId, friendId, user, replyTo, sendMessage, emitTypingStop, toast]);

  const handleSendGif = useCallback(async (item) => {
    setShowMemePanel(false);
    setSending(true);
    hapticTap(10);
    const content = item.title || 'GIF';
    const memeData = {
      url: item.url,
      preview: item.preview,
      title: item.title,
      isSticker: item.isSticker,
    };
    const tempMsg = {
      _id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId: convId,
      sender: { _id: user._id, username: user.username, displayName: user.displayName, avatarColor: user.avatarColor },
      type: 'gif',
      content,
      memeData,
      reactions: [],
      readBy: [user._id],
      createdAt: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'instant' }), 10);

    try {
      const response = await sendMessage({
        conversationId: convId,
        receiverId: friendId,
        content,
        type: 'gif',
        memeData,
      });
      setMessages((prev) =>
        prev.map((m) => m._id === tempMsg._id ? response.message : m)
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m._id !== tempMsg._id));
      toast.error('Failed to send GIF');
    } finally {
      setSending(false);
    }
  }, [convId, friendId, user, sendMessage, toast]);

  const handleInputChange = useCallback((e) => {
    const val = e.target.value;
    
    // Auto-search memes
    if (val.length > 2) {
      const q = val.toLowerCase();
      const allMemes = [...LOCAL_MEMES, ...imgflipMemes];
      const suggestions = allMemes.filter(m => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)).slice(0, 10);
      setSuggestedMemes(suggestions);
    } else {
      setSuggestedMemes([]);
    }

    const now = Date.now();
    if (!isTyping) {
      setIsTyping(true);
      // Fallback to regular emit if volatile isn't exposed through the hook cleanly
      emitTypingStart(convId, friendId); 
      lastTypingEmitRef.current = now;
    } else if (now - lastTypingEmitRef.current >= 500) {
      emitTypingStart(convId, friendId);
      lastTypingEmitRef.current = now;
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      emitTypingStop(convId, friendId);
    }, 2000);
  }, [imgflipMemes, isTyping, convId, friendId, emitTypingStart, emitTypingStop]);

  const handleReact = useCallback((messageId, emoji) => {
    reactMessage(messageId, emoji, convId);
  }, [reactMessage, convId]);

  const handleDelete = useCallback(async (messageId, isOwn) => {
    try {
      if (isOwn) {
        await api.delete(`/messages/${messageId}?forEveryone=true`);
        setMessages((prev) =>
          prev.map((m) => m._id === messageId ? { ...m, deletedForEveryone: true, content: 'This message was deleted' } : m)
        );
      } else {
        await api.delete(`/messages/${messageId}`);
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      }
    } catch {
      toast.error('Failed to delete message');
    }
  }, [toast]);

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollFab(distFromBottom > 300);

    // Simple virtualization: calculate visible range
    const scrollTop = el.scrollTop;
    const itemHeight = 80; // Approximate height of a message bubble
    const viewportHeight = el.clientHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 10);
    const endIndex = Math.min(messages.length, Math.ceil((scrollTop + viewportHeight) / itemHeight) + 10);
    setVisibleRange({ start: startIndex, end: endIndex });
  }, [messages.length]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollFab(false);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  }, [handleSendText]);

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="flex gap-1"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>
        <span className="font-mono text-xs mt-3" style={{ color: '#6B6B8A' }}>ESTABLISHING CHANNEL...</span>
      </div>
    );
  }

  if (editorTemplate) {
    return (
      <MemeEditor
        template={editorTemplate}
        onCancel={() => setEditorTemplate(null)}
        onSend={(base64, name) => {
          setEditorTemplate(null);
          handleSendGif({ url: base64, title: name, preview: base64 });
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {!socketConnected && (
        <div
          className="absolute top-0 left-0 right-0 z-20 py-1 text-center font-mono text-[10px] tracking-widest"
          style={{ background: 'rgba(255,183,3,0.15)', color: '#FFB703', borderBottom: '1px solid #FFB70333' }}
        >
          ● Reconnecting...
        </div>
      )}
      {/* Header */}
      <div
        className="flex items-center gap-3 px-3 py-3 flex-shrink-0"
        style={{ background: 'rgba(18,18,26,0.95)', borderBottom: '1px solid #252535', backdropFilter: 'blur(20px)' }}
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
        >
          📞
        </button>
        <button
          type="button"
          onClick={() => { hapticTap(10); router.push(`/call/${friendId}?type=video`); }}
          className="hud-btn px-2.5 py-1.5 rounded-sm text-xs"
          style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.25)', color: '#00F5FF' }}
        >
          📹
        </button>
        <button
          type="button"
          onClick={() => router.push('/camera')}
          className="hud-btn px-2 py-1 rounded-sm text-[10px]"
          style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.35)', color: '#00F5FF' }}
        >
          📸
        </button>
                <div className="font-mono text-[10px] tracking-widest px-2 py-1 rounded-sm" style={{ background: '#1A1A26', border: '1px solid #252535', color: '#6B6B8A' }}>
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

      {/* Load more */}
      {hasMore && (
        <button
          className="w-full py-2 font-mono text-[10px] tracking-widest text-center"
          style={{ color: '#6B6B8A', background: '#12121A', borderBottom: '1px solid #252535' }}
          onClick={() => { const next = page + 1; setPage(next); fetchMessages(next); }}
        >
          ↑ LOAD EARLIER MESSAGES
        </button>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
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
        <div style={{ paddingTop: visibleRange.start * 80, paddingBottom: (messages.length - visibleRange.end) * 80 }}>
        {messages.slice(visibleRange.start, visibleRange.end).map((msg) => (
          <MessageBubble
            key={msg._id}
            message={msg}
            isOwn={msg.sender?._id === user._id || msg.sender === user._id}
            onReact={handleReact}
            onReply={setReplyTo}
            onDelete={handleDelete}
            currentUserId={user._id}
          />
        ))}
        </div>
        {/* Typing indicator */}
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
            onClick={scrollToBottom}
            className="fixed bottom-28 right-6 z-30 w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(0,245,255,0.2)',
              border: '1px solid #00F5FF',
              boxShadow: '0 0 16px rgba(0,245,255,0.4)',
              color: '#00F5FF',
            }}
            aria-label="Scroll to bottom"
          >
            ↓
          </button>
        )}
      </div>

      {/* Meme Panel */}
      {showMemePanel && (
        <GifPanel
          onSelect={handleSendGif}
          onClose={() => setShowMemePanel(false)}
        />
      )}

      {/* Bottom bar */}
      <div className="flex-shrink-0" style={{ background: '#0A0A0F', borderTop: '1px solid #252535' }}>
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
                onClick={() => { setSuggestedMemes([]); setEditorTemplate(meme); }}
                className="flex-shrink-0 relative w-16 h-16 rounded-md overflow-hidden border border-[#252535] bg-[#0A0A0F]"
              >
                <img src={meme.url} alt={meme.name} className="w-full h-full object-cover opacity-70 hover:opacity-100 transition-opacity" loading="lazy" />
              </button>
            ))}
          </div>
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
          >
            🎭
          </button>

          {/* Text input */}
          <div className="flex-1 min-w-0 flex flex-col">
            <input
              ref={inputRef}
              className="hud-input w-full px-3 py-2.5 rounded-sm text-sm"
              placeholder="TRANSMIT MESSAGE..."
              defaultValue=""
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              maxLength={MESSAGE_MAX_LENGTH}
              style={{ fontSize: 14 }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSendText}
            disabled={sending}
            className="w-9 h-9 flex items-center justify-center rounded-sm flex-shrink-0 transition-all"
            style={{
              background: 'linear-gradient(135deg, #00F5FF, #0099CC)',
              border: `1px solid #00F5FF`,
              boxShadow: '0 0 12px rgba(0,245,255,0.3)',
              opacity: sending ? 0.7 : 1,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A0A0F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
