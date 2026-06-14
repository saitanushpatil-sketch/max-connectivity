import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/router';
import Link from 'next/link';
import useAuthStore from '../context/authStore';
import useSocket from '../hooks/useSocket';
import BottomNav from '../components/ui/BottomNav';
import PullToRefresh from '../components/ui/PullToRefresh';
import Avatar from '../components/ui/Avatar';
import api from '../utils/api';
import { SkeletonRow } from '../components/ui/Skeleton';
import useNotificationStore from '../context/notificationStore';
import NotificationCenter from '../components/ui/NotificationCenter';
import hapticTap from '../utils/haptic';

const buildConvId = (a, b) => [a, b].sort().join('_');
const timeAgo = (date) => {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

const fetchChats = async (user) => {
  if (!user?._id) return [];
  try {
    const { data } = await api.get('/conversations');
    return (data.conversations || []).map(conv => ({
      friend: conv.friend,
      convId: conv.convId,
      last: conv.lastMessage,
      unread: conv.unreadCount || 0,
    }));
  } catch (_) {
    return [];
  }
};

const ChatListItem = memo(({ friend, convId, last, unread }) => (
  <Link
    href={`/chat/${convId}`}
    className="flex items-center gap-3 px-4 py-3 holo-hover transition-colors"
    style={{ borderBottom: '1px solid #1A1A26' }}
  >
    <Avatar user={friend} size={46} showStatus />
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <span className="font-heading font-semibold truncate" style={{ color: unread > 0 ? '#E8E8FF' : '#B0B0C8' }}>
          {friend.displayName || friend.username}
        </span>
        <span className="font-mono text-[10px] ml-2 flex-shrink-0" style={{ color: '#6B6B8A' }}>
          {last ? timeAgo(last.createdAt) : ''}
        </span>
      </div>
      <div className="flex items-center justify-between mt-0.5">
        <span className="font-body text-xs truncate" style={{ color: '#6B6B8A', maxWidth: '80%' }}>
          {last
            ? last.deletedForEveryone
              ? '⊘ Message deleted'
              : last.type === 'meme'
              ? `🎭 ${last.content?.startsWith?.('data:image') ? 'Custom meme' : last.memeData?.name || 'Meme'}`
              : last.content
            : `@${friend.username}`}
        </span>
        {unread > 0 && (
          <span className="unread-badge flex-shrink-0 ml-2">{unread > 9 ? '9+' : unread}</span>
        )}
      </div>
    </div>
  </Link>
));



function Chats() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const { unreadCount, initNotifications } = useNotificationStore();

  const { data: initialChats, error, mutate } = useSWR(
    user?._id ? 'chats_data' : null,
    () => fetchChats(user),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  const loading = !initialChats && !error;
  
  const [liveUpdates, setLiveUpdates] = useState({});

  useEffect(() => {
    initNotifications();
  }, [initNotifications]);

  useSocket({
    onNewMessageNotification: ({ conversationId, message }) => {
      setLiveUpdates((prev) => ({
        ...prev,
        [conversationId]: {
          last: message,
          unread: (prev[conversationId]?.unread || 0) + 1,
        },
      }));
    },
    onUserStatus: ({ userId, status }) => {
      mutate((currentChats) => {
        if (!currentChats) return currentChats;
        return currentChats.map(c => c.friend._id === userId ? { ...c, friend: { ...c.friend, status } } : c);
      }, false);
    },
  });

  const friendList = useMemo(() => {
    if (!initialChats) return [];
    
    const merged = initialChats.map((chat) => {
      const live = liveUpdates[chat.convId];
      if (!live) return chat;
      return {
        ...chat,
        last: live.last || chat.last,
        unread: chat.unread + (live.unread || 0)
      };
    });

    return merged.sort((a, b) => {
      const timeA = a.last?.createdAt ? new Date(a.last.createdAt).getTime() : 0;
      const timeB = b.last?.createdAt ? new Date(b.last.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [initialChats, liveUpdates]);

  const handleNavigate = useCallback((url) => {
    router.push(url);
  }, [router]);

  const [showGreeting, setShowGreeting] = useState(false);
  
  useEffect(() => {
    if (!sessionStorage.getItem('jarvis_greeted') && user) {
      setShowGreeting(true);
      sessionStorage.setItem('jarvis_greeted', 'true');
      setTimeout(() => setShowGreeting(false), 2000);
    }
  }, [user]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'GOOD MORNING' : hour < 17 ? 'GOOD AFTERNOON' : hour < 21 ? 'GOOD EVENING' : 'GOOD NIGHT';
  const greetingMessage = `${greeting}, ${user?.displayName?.toUpperCase() || 'OPERATOR'}. SYSTEMS ONLINE.`;

  return (
    <div className="flex flex-col h-full pb-16">
      {showGreeting && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050508]">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-[#00F5FF] shadow-[0_0_15px_#00F5FF] animate-scanline" />
          <p className="font-mono text-[#00F5FF] text-sm tracking-[0.2em] uppercase animate-pulse text-center px-4">
            {greetingMessage}
          </p>
        </div>
      )}
      {/* Header */}
      <div className="px-4 pt-10 pb-3" style={{ borderBottom: '1px solid #252535' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] tracking-widest mb-0.5" style={{ color: '#6B6B8A' }}>SYS://COMMUNICATIONS</div>
            <h1 className="font-heading text-2xl font-bold tracking-wider" style={{ color: '#00F5FF', textShadow: '0 0 15px rgba(0,245,255,0.3)' }}>
              COMMS
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { hapticTap(10); setShowNotificationCenter(true); }}
              className="w-9 h-9 flex items-center justify-center rounded-sm relative"
              style={{ background: '#1A1A26', border: '1px solid #252535' }}
            >
              <span style={{ fontSize: 16 }}>🔔</span>
              {unreadCount > 0 && (
                <span 
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#FF006E] shadow-[0_0_6px_#FF006E]" 
                />
              )}
            </button>
            <Link href="/search" className="w-9 h-9 flex items-center justify-center rounded-sm" style={{ background: '#1A1A26', border: '1px solid #252535' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00F5FF" strokeWidth="1.8" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {showNotificationCenter && (
        <NotificationCenter
          onClose={() => setShowNotificationCenter(false)}
          onNavigate={handleNavigate}
        />
      )}

      <div className="flex-1 overflow-y-auto" onScroll={(e) => {
          const { scrollTop, clientHeight } = e.target;
          const start = Math.max(0, Math.floor(scrollTop / 70) - 5);
          const end = Math.min(friendList.length, Math.ceil((scrollTop + clientHeight) / 70) + 5);
          setVisibleRange({ start, end });
      }}>
      <PullToRefresh onRefresh={() => mutate()}>
        {loading ? (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <SkeletonRow key={i} />
            ))}
          </>
        ) : friendList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 px-8 text-center">
            <div className="w-16 h-16 flex items-center justify-center rounded-sm" style={{ border: '1px solid #252535', background: '#12121A' }}>
              <span style={{ fontSize: 28 }}>💬</span>
            </div>
            <div>
              <p className="font-heading text-lg" style={{ color: '#E8E8FF' }}>NO ACTIVE CHANNELS</p>
              <p className="font-mono text-xs mt-1" style={{ color: '#6B6B8A' }}>Add friends to start a comms channel</p>
            </div>
            <Link href="/search" className="hud-btn hud-btn-primary px-6 py-2 rounded-sm text-xs">
              FIND OPERATORS
            </Link>
          </div>
        ) : (
          <div style={{ paddingTop: visibleRange.start * 70, paddingBottom: (friendList.length - visibleRange.end) * 70 }}>
          {friendList.slice(visibleRange.start, visibleRange.end).map(({ friend, convId, last, unread }) => (
            <ChatListItem key={friend._id} friend={friend} convId={convId} last={last} unread={unread} />
          ))}
          </div>
        )}
      </PullToRefresh>
      </div>
      <BottomNav />
    </div>
  );
}

export default memo(Chats);
