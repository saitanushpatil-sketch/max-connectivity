import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import useAuthStore from '../../context/authStore';
import useSocket from '../../hooks/useSocket';
import api from '../../utils/api';
import useToast from '../../hooks/useToast';
import hapticTap from '../../utils/haptic';
import ChatHeader from '../../components/chat/ChatHeader';
import ChatMessages from '../../components/chat/ChatMessages';
import ChatInput from '../../components/chat/ChatInput';

const MemeEditor = dynamic(() => import('../../components/meme/MemeEditor'), { ssr: false });

const buildConvId = (a, b) => [a, b].sort().join('_');

const CHAT_THEMES = {
  jarvis:  { accent: '#00F5FF', bg: '#0A0A0F', bubble: '#12121A', border: '#252535', label: '💎 JARVIS' },
  sunset:  { accent: '#FF6B6B', bg: '#1A0A0F', bubble: '#1A1215', border: '#352525', label: '🌅 SUNSET' },
  forest:  { accent: '#06D6A0', bg: '#0A0F0D', bubble: '#121A17', border: '#253530', label: '🌲 FOREST' },
  ocean:   { accent: '#4ECDC4', bg: '#0A0D0F', bubble: '#12171A', border: '#253035', label: '🌊 OCEAN' },
  void:    { accent: '#8B5CF6', bg: '#050508', bubble: '#0D0D14', border: '#1A1A26', label: '🕳️ VOID' },
};

const LOCAL_MEMES = [
  ...['mahesh-babu-pointing', 'allu-arjun-pushpa', 'pawan-kalyan-serious', 'ntr-angry', 'brahmanandam-reaction', 'venkatesh-surprised'].map(n => ({ _id: n, name: n.replace(/-/g, ' ').toUpperCase(), url: `/memes/${n}.svg`, category: 'Telugu', isTemplate: true })),
  ...['srk-arms-open', 'ranveer-screaming', 'akshay-salute', 'amitabh-pointing'].map(n => ({ _id: n, name: n.replace(/-/g, ' ').toUpperCase(), url: `/memes/${n}.svg`, category: 'Hindi', isTemplate: true })),
  ...['drake-approve', 'distracted-boyfriend', 'this-is-fine', 'surprised-pikachu', 'two-buttons', 'gru-plan', 'stonks', 'brain-expanding', 'panik-kalm', 'gigachad'].map(n => ({ _id: n, name: n.replace(/-/g, ' ').toUpperCase(), url: `/memes/${n}.svg`, category: 'Internet', isTemplate: true }))
];

const getStoredTheme = (convId) => {
  if (typeof window === 'undefined') return 'jarvis';
  return localStorage.getItem(`chat_theme_${convId}`) || 'jarvis';
};
const setStoredTheme = (convId, theme) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`chat_theme_${convId}`, theme);
};

export default function ChatPage() {
  const router = useRouter();
  const { convId } = router.query;
  const { user } = useAuthStore();

  // --- State ---
  const [friend, setFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editorTemplate, setEditorTemplate] = useState(null);
  const [suggestedMemes, setSuggestedMemes] = useState([]);
  const [imgflipMemes, setImgflipMemes] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [friendTyping, setFriendTyping] = useState(false);
  const [friendStatus, setFriendStatus] = useState('offline');
  const [socketConnected, setSocketConnected] = useState(true);
  const [showE2ETooltip, setShowE2ETooltip] = useState(false);
  const [showScrollFab, setShowScrollFab] = useState(false);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const [chatTheme, setChatTheme] = useState('jarvis');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [disappearAfter, setDisappearAfter] = useState(0);

  const typingTimerRef = useRef(null);
  const lastTypingEmitRef = useRef(0);
  const e2eRef = useRef(null);
  const { toast } = useToast();

  const friendId = convId ? convId.split('_').find((id) => id !== user?._id) : null;
  const theme = CHAT_THEMES[chatTheme] || CHAT_THEMES.jarvis;

  // --- Theme ---
  useEffect(() => {
    if (convId) setChatTheme(getStoredTheme(convId));
  }, [convId]);

  const handleSetTheme = (t) => {
    setChatTheme(t);
    setStoredTheme(convId, t);
    setShowThemePicker(false);
  };

  // --- Data fetching ---
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
      if (pg === 1) setMessages(data.messages || []);
      else setMessages((prev) => [...(data.messages || []), ...prev]);
      setHasMore(data.pagination?.hasMore || false);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => {
    if (!convId || !user) return;
    fetchFriend(friendId);
    fetchMessages(1);
    fetch('https://api.imgflip.com/get_memes')
      .then(r => r.json())
      .then(d => {
        if (d.success) setImgflipMemes(d.data.memes.map(m => ({
          _id: m.id, name: m.name.toUpperCase(), url: m.url, category: 'Imgflip', isTemplate: true
        })));
      })
      .catch(() => {});
  }, [convId, user]);

  // --- Socket ---
  const { joinConversation, sendMessage, emitTypingStart, emitTypingStop, reactMessage, markRead } = useSocket({
    onConnect: () => setSocketConnected(true),
    onDisconnect: () => setSocketConnected(false),
    onReceiveMessage: ({ message }) => {
      if (message.conversationId !== convId) return;
      setMessages((prev) => {
        const hasOptimistic = prev.some((m) => m._optimistic && m.type === message.type && m.content === message.content);
        if (hasOptimistic) return prev.map((m) => m._optimistic && m.content === message.content ? message : m);
        if (prev.some((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });
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

  // --- E2E tooltip close on outside click ---
  useEffect(() => {
    if (!showE2ETooltip) return;
    const handleOutside = (e) => {
      if (e2eRef.current && !e2eRef.current.contains(e.target)) setShowE2ETooltip(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [showE2ETooltip]);

  // --- Message handlers ---
  const createOptimisticMsg = (type, content, extra = {}) => ({
    _id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    conversationId: convId,
    sender: { _id: user._id, username: user.username, displayName: user.displayName, avatarColor: user.avatarColor },
    type, content, reactions: [], readBy: [user._id],
    createdAt: new Date().toISOString(), _optimistic: true,
    ...extra,
  });

  const handleSendText = useCallback(async (content) => {
    if (!content || sending) return;
    hapticTap(10);
    const savedReply = replyTo;
    setReplyTo(null);
    setSending(true);
    emitTypingStop(convId, friendId);

    const tempMsg = createOptimisticMsg('text', content, { replyTo: savedReply || null });
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const response = await sendMessage({
        conversationId: convId, receiverId: friendId, content,
        type: 'text', replyTo: savedReply?._id || null,
        disappearAfter: disappearAfter || undefined,
      });
      setMessages((prev) => prev.map((m) => m._id === tempMsg._id ? response.message : m));
    } catch {
      setMessages((prev) => prev.filter((m) => m._id !== tempMsg._id));
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  }, [sending, convId, friendId, user, replyTo, sendMessage, emitTypingStop, toast, disappearAfter]);

  const handleSendGif = useCallback(async (item) => {
    setSending(true);
    hapticTap(10);
    const content = item.title || 'GIF';
    const memeData = { url: item.url, preview: item.preview, title: item.title, isSticker: item.isSticker };
    const tempMsg = createOptimisticMsg('gif', content, { memeData });
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const response = await sendMessage({
        conversationId: convId, receiverId: friendId, content,
        type: 'gif', memeData, disappearAfter: disappearAfter || undefined,
      });
      setMessages((prev) => prev.map((m) => m._id === tempMsg._id ? response.message : m));
    } catch {
      setMessages((prev) => prev.filter((m) => m._id !== tempMsg._id));
      toast.error('Failed to send GIF');
    } finally {
      setSending(false);
    }
  }, [convId, friendId, user, sendMessage, toast, disappearAfter]);

  const handleSendVoice = useCallback(async (base64, duration) => {
    if (!base64) return;
    const content = `Voice message (${duration}s)`;
    const memeData = { url: base64, duration };
    const tempMsg = createOptimisticMsg('voice', content, { memeData });
    setMessages(prev => [...prev, tempMsg]);

    try {
      const response = await sendMessage({
        conversationId: convId, receiverId: friendId, content,
        type: 'voice', memeData, disappearAfter: disappearAfter || undefined,
      });
      setMessages(prev => prev.map(m => m._id === tempMsg._id ? response.message : m));
    } catch {
      setMessages(prev => prev.filter(m => m._id !== tempMsg._id));
      toast.error('Failed to send voice message');
    }
  }, [convId, friendId, user, sendMessage, toast, disappearAfter]);

  const handleInputChange = useCallback((e) => {
    const val = e.target.value;
    if (val.length > 2) {
      const q = val.toLowerCase();
      const allMemes = [...LOCAL_MEMES, ...imgflipMemes];
      setSuggestedMemes(allMemes.filter(m => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)).slice(0, 10));
    } else {
      setSuggestedMemes([]);
    }
    const now = Date.now();
    if (!isTyping) {
      setIsTyping(true);
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

  const handleReact = useCallback((messageId, emoji) => reactMessage(messageId, emoji, convId), [reactMessage, convId]);

  const handleDelete = useCallback(async (messageId, isOwn) => {
    try {
      if (isOwn) {
        await api.delete(`/messages/${messageId}?forEveryone=true`);
        setMessages((prev) => prev.map((m) => m._id === messageId ? { ...m, deletedForEveryone: true, content: 'This message was deleted' } : m));
      } else {
        await api.delete(`/messages/${messageId}`);
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      }
    } catch {
      toast.error('Failed to delete message');
    }
  }, [toast]);

  const handleScroll = useCallback(({ scrollTop, clientHeight, distFromBottom }) => {
    setShowScrollFab(distFromBottom > 300);
    const startIndex = Math.max(0, Math.floor(scrollTop / 80) - 10);
    const endIndex = Math.min(messages.length, Math.ceil((scrollTop + clientHeight) / 80) + 10);
    setVisibleRange({ start: startIndex, end: endIndex });
  }, [messages.length]);

  // --- Loading state ---
  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="flex gap-1"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>
        <span className="font-mono text-xs mt-3" style={{ color: '#6B6B8A' }}>ESTABLISHING CHANNEL...</span>
      </div>
    );
  }

  // --- Meme editor ---
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
    <div className="flex flex-col h-full relative" style={{ background: theme.bg }}>
      <ChatHeader
        friend={friend}
        friendStatus={friendStatus}
        theme={theme}
        convId={convId}
        friendId={friendId}
        socketConnected={socketConnected}
        showE2ETooltip={showE2ETooltip}
        setShowE2ETooltip={setShowE2ETooltip}
        showThemePicker={showThemePicker}
        setShowThemePicker={setShowThemePicker}
        e2eRef={e2eRef}
      />

      {/* Theme Picker Dropdown */}
      {showThemePicker && (
        <div
          className="absolute top-16 right-3 z-30 p-2 rounded-sm flex flex-col gap-1"
          style={{ background: theme.bubble, border: `1px solid ${theme.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
        >
          <div className="font-mono text-[9px] tracking-widest px-2 py-1" style={{ color: '#6B6B8A' }}>CHAT THEME</div>
          {Object.entries(CHAT_THEMES).map(([key, t]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleSetTheme(key)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-left transition-all"
              style={{
                background: chatTheme === key ? `${t.accent}18` : 'transparent',
                border: `1px solid ${chatTheme === key ? t.accent : 'transparent'}`,
                color: chatTheme === key ? t.accent : '#6B6B8A',
              }}
            >
              <span className="w-3 h-3 rounded-full" style={{ background: t.accent, boxShadow: `0 0 6px ${t.accent}66` }} />
              <span className="font-mono text-[10px] tracking-widest">{t.label}</span>
            </button>
          ))}
        </div>
      )}

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

      <ChatMessages
        messages={messages}
        visibleRange={visibleRange}
        friend={friend}
        friendTyping={friendTyping}
        user={user}
        showScrollFab={showScrollFab}
        onReact={handleReact}
        onReply={setReplyTo}
        onDelete={handleDelete}
        onScroll={handleScroll}
        onScrollToBottom={() => setShowScrollFab(false)}
      />

      <ChatInput
        convId={convId}
        friendId={friendId}
        user={user}
        theme={theme}
        replyTo={replyTo}
        setReplyTo={setReplyTo}
        disappearAfter={disappearAfter}
        setDisappearAfter={setDisappearAfter}
        suggestedMemes={suggestedMemes}
        setSuggestedMemes={setSuggestedMemes}
        onSendText={handleSendText}
        onSendGif={handleSendGif}
        onSendVoice={handleSendVoice}
        onInputChange={handleInputChange}
        onEditorTemplate={setEditorTemplate}
        sending={sending}
      />
    </div>
  );
}
