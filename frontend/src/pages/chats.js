import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import useAuthStore from '../context/authStore';
import useSocket from '../hooks/useSocket';
import BottomNav from '../components/ui/BottomNav';
import PullToRefresh from '../components/ui/PullToRefresh';
import Avatar from '../components/ui/Avatar';
import api from '../utils/api';

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

export default function Chats() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [friends, setFriends] = useState([]);
  const [lastMessages, setLastMessages] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchFriends = useCallback(async () => {
    try {
      const { data } = await api.get('/friends');
      setFriends(data.friends || []);
      // Fetch last message for each friend
      for (const friend of data.friends || []) {
        const convId = buildConvId(user._id, friend._id);
        try {
          const msgRes = await api.get(`/messages/${convId}?page=1`);
          const msgs = msgRes.data.messages || [];
          if (msgs.length > 0) {
            const last = msgs[msgs.length - 1];
            setLastMessages((prev) => ({ ...prev, [convId]: last }));
            const unread = msgs.filter(
              (m) => m.sender?._id !== user._id && !m.readBy?.includes(user._id)
            ).length;
            setUnreadCounts((prev) => ({ ...prev, [convId]: unread }));
          }
        } catch (_) {}
      }
    } catch (_) {}
    setLoading(false);
  }, [user?._id]);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  useSocket({
    onNewMessageNotification: ({ conversationId, message }) => {
      setLastMessages((prev) => ({ ...prev, [conversationId]: message }));
      setUnreadCounts((prev) => ({ ...prev, [conversationId]: (prev[conversationId] || 0) + 1 }));
    },
    onUserStatus: ({ userId, status }) => {
      setFriends((prev) => prev.map((f) => f._id === userId ? { ...f, status } : f));
    },
  });

  const sortedFriends = useMemo(() => {
    if (!user?._id) return [];
    return [...friends].sort((a, b) => {
      const convA = buildConvId(user._id, a._id);
      const convB = buildConvId(user._id, b._id);
      const timeA = lastMessages[convA]?.createdAt ? new Date(lastMessages[convA].createdAt).getTime() : 0;
      const timeB = lastMessages[convB]?.createdAt ? new Date(lastMessages[convB].createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [friends, lastMessages, user?._id]);

  const friendList = useMemo(() => {
    if (!user?._id) return [];
    return sortedFriends.map((friend) => {
      const convId = buildConvId(user._id, friend._id);
      const last = lastMessages[convId];
      const unread = unreadCounts[convId] || 0;
      return { friend, convId, last, unread };
    });
  }, [sortedFriends, lastMessages, unreadCounts, user?._id]);

  return (
    <div className="flex flex-col h-full pb-16">
      {/* Header */}
      <div className="px-4 pt-10 pb-3" style={{ borderBottom: '1px solid #252535' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] tracking-widest mb-0.5" style={{ color: '#6B6B8A' }}>SYS://COMMUNICATIONS</div>
            <h1 className="font-heading text-2xl font-bold tracking-wider" style={{ color: '#00F5FF', textShadow: '0 0 15px rgba(0,245,255,0.3)' }}>
              COMMS
            </h1>
          </div>
          <Link href="/search" className="w-9 h-9 flex items-center justify-center rounded-sm" style={{ background: '#1A1A26', border: '1px solid #252535' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00F5FF" strokeWidth="1.8" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </Link>
        </div>
      </div>

      <PullToRefresh onRefresh={fetchFriends} className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex gap-1"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>
          </div>
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
          friendList.map(({ friend, convId, last, unread }) => (
              <Link
                key={friend._id}
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
                          ? `🎭 ${last.memeData?.name || 'Meme'}`
                          : last.content
                        : `@${friend.username}`}
                    </span>
                    {unread > 0 && (
                      <span className="unread-badge flex-shrink-0 ml-2">{unread > 9 ? '9+' : unread}</span>
                    )}
                  </div>
                </div>
              </Link>
          ))
        )}
      </PullToRefresh>
      <BottomNav />
    </div>
  );
}
