import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Avatar from '../components/ui/Avatar';
import BottomNav from '../components/ui/BottomNav';
import PullToRefresh from '../components/ui/PullToRefresh';
import api from '../utils/api';
import { SkeletonRow } from '../components/ui/Skeleton';
import useToast from '../hooks/useToast';
import HudButton from '../components/ui/HudButton';
import useAuthStore from '../context/authStore';

const buildConvId = (a, b) => [a, b].sort().join('_');

export default function Friends() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [tab, setTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const { toast } = useToast();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [fr, pend] = await Promise.all([api.get('/friends'), api.get('/friends/pending')]);
      setFriends(fr.data.friends || []);
      setIncoming(pend.data.incoming || []);
      setOutgoing(pend.data.outgoing || []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const respond = async (requestId, action) => {
    setActionLoading(requestId);
    try {
      await api.put('/friends/respond', { requestId, action });
      toast.success(action === 'accept' ? 'Friend request accepted' : 'Request declined');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to respond');
    }
    setActionLoading(null);
  };

  const removeFriend = async (friendId) => {
    try {
      await api.delete(`/friends/${friendId}`);
      fetchAll();
    } catch (_) {}
  };

  const TABS = [
    { key: 'friends', label: `SQUAD (${friends.length})` },
    { key: 'requests', label: `REQUESTS ${incoming.length > 0 ? `(${incoming.length})` : ''}` },
  ];

  return (
    <div className="flex flex-col h-full pb-16">
      {/* Header */}
      <div className="px-4 pt-10 pb-3" style={{ borderBottom: '1px solid #252535' }}>
        <div className="font-mono text-[10px] tracking-widest mb-0.5" style={{ color: '#6B6B8A' }}>SYS://NETWORK</div>
        <h1 className="font-heading text-2xl font-bold tracking-wider" style={{ color: '#00F5FF', textShadow: '0 0 15px rgba(0,245,255,0.3)' }}>SQUAD</h1>
      </div>

      {/* Tabs */}
      <div className="flex px-4 pt-3 gap-4" style={{ borderBottom: '1px solid #252535' }}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="pb-2 font-mono text-xs tracking-widest transition-colors"
            style={{
              color: tab === key ? '#00F5FF' : '#6B6B8A',
              borderBottom: tab === key ? '2px solid #00F5FF' : '2px solid transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <PullToRefresh onRefresh={fetchAll} className="flex-1">
        {loading ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <SkeletonRow key={i} />
            ))}
          </>
        ) : tab === 'friends' ? (
          friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <span style={{ fontSize: 32 }}>👥</span>
              <span className="font-mono text-xs tracking-widest" style={{ color: '#6B6B8A' }}>NO SQUAD MEMBERS</span>
            </div>
          ) : (
            friends.map((f) => (
              <div key={f._id} className="flex items-center gap-3 px-4 py-3 holo-hover" style={{ borderBottom: '1px solid #1A1A26' }}>
                <Avatar user={f} size={42} showStatus />
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold" style={{ color: '#E8E8FF', fontSize: 14 }}>{f.displayName || f.username}</p>
                  <p className="font-mono text-[10px] tracking-widest" style={{ color: '#6B6B8A' }}>@{f.username}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/chat/${buildConvId(user._id, f._id)}`)}
                    className="hud-btn px-3 py-1.5 rounded-sm text-[10px]"
                    style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.3)', color: '#00F5FF' }}
                  >
                    MSG
                  </button>
                  <button
                    onClick={() => router.push({ pathname: '/battle', query: { challenge: f._id } })}
                    className="hud-btn px-2 py-1.5 rounded-sm text-[10px]"
                    style={{ background: 'rgba(255,0,110,0.1)', border: '1px solid rgba(255,0,110,0.35)', color: '#FF006E' }}
                  >
                    ⚔️
                  </button>
                  <button
                    onClick={() => router.push({ pathname: '/games', query: { game: 'ttt', opponent: f._id, name: f.displayName || f.username } })}
                    className="hud-btn px-2 py-1.5 rounded-sm text-[10px]"
                    style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.35)', color: '#00F5FF' }}
                  >
                    ⭕
                  </button>
                  <button
                    onClick={() => removeFriend(f._id)}
                    className="hud-btn px-3 py-1.5 rounded-sm text-[10px]"
                    style={{ background: 'rgba(255,0,110,0.08)', border: '1px solid rgba(255,0,110,0.2)', color: '#FF006E' }}
                  >
                    RM
                  </button>
                </div>
              </div>
            ))
          )
        ) : (
          <div className="px-4 pt-3">
            {incoming.length > 0 && (
              <>
                <div className="font-mono text-[10px] tracking-widest mb-2" style={{ color: '#6B6B8A' }}>// INCOMING</div>
                {incoming.map((req) => (
                  <div key={req._id} className="flex items-center gap-3 py-3 mb-2 p-3 rounded-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
                    <Avatar user={req.sender} size={40} />
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-semibold text-sm" style={{ color: '#E8E8FF' }}>{req.sender.displayName || req.sender.username}</p>
                      <p className="font-mono text-[10px]" style={{ color: '#6B6B8A' }}>@{req.sender.username}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => respond(req._id, 'accept')} className="px-3 py-1.5 rounded-sm font-mono text-[10px]" style={{ background: 'rgba(6,214,160,0.15)', border: '1px solid rgba(6,214,160,0.4)', color: '#06D6A0' }}>✓ ACC</button>
                      <button onClick={() => respond(req._id, 'reject')} className="px-3 py-1.5 rounded-sm font-mono text-[10px]" style={{ background: 'rgba(255,0,110,0.08)', border: '1px solid rgba(255,0,110,0.3)', color: '#FF006E' }}>✕ REJ</button>
                    </div>
                  </div>
                ))}
              </>
            )}
            {outgoing.length > 0 && (
              <>
                <div className="font-mono text-[10px] tracking-widest mb-2 mt-3" style={{ color: '#6B6B8A' }}>// OUTGOING</div>
                {outgoing.map((req) => (
                  <div key={req._id} className="flex items-center gap-3 py-3 mb-2 p-3 rounded-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
                    <Avatar user={req.receiver} size={40} />
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-semibold text-sm" style={{ color: '#E8E8FF' }}>{req.receiver.displayName || req.receiver.username}</p>
                      <p className="font-mono text-[10px]" style={{ color: '#6B6B8A' }}>@{req.receiver.username} · PENDING</p>
                    </div>
                    <span className="font-mono text-[10px] px-2 py-1 rounded-sm" style={{ background: 'rgba(255,183,3,0.1)', border: '1px solid rgba(255,183,3,0.3)', color: '#FFB703' }}>SENT</span>
                  </div>
                ))}
              </>
            )}
            {incoming.length === 0 && outgoing.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <span style={{ fontSize: 32 }}>📡</span>
                <span className="font-mono text-xs tracking-widest" style={{ color: '#6B6B8A' }}>NO PENDING REQUESTS</span>
              </div>
            )}
          </div>
        )}
      </PullToRefresh>
      <BottomNav />
    </div>
  );
}
