import { useState, useEffect, useCallback } from 'react';
import Avatar from '../components/ui/Avatar';
import BottomNav from '../components/ui/BottomNav';
import api from '../utils/api';
import useAuthStore from '../context/authStore';

export default function Search() {
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(false);
  const [actioning, setActioning] = useState({});

  useEffect(() => {
    api.get('/friends').then(r => setFriends(r.data.friends?.map(f => f._id) || [])).catch(() => {});
    api.get('/friends/pending').then(r => {
      setPending({
        incoming: r.data.incoming?.map(req => req.sender._id) || [],
        outgoing: r.data.outgoing?.map(req => ({ id: req._id, receiverId: req.receiver._id })) || [],
      });
    }).catch(() => {});
  }, []);

  const search = useCallback(async (q) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
      setResults(data.users || []);
    } catch (_) { setResults([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const addFriend = async (userId) => {
    setActioning((a) => ({ ...a, [userId]: true }));
    try {
      await api.post('/friends/request', { userId });
      setPending((p) => ({
        ...p,
        outgoing: [...p.outgoing, { id: `temp_${userId}`, receiverId: userId }],
      }));
    } catch (_) {}
    setActioning((a) => ({ ...a, [userId]: false }));
  };

  const getStatus = (uid) => {
    if (friends.includes(uid)) return 'friends';
    if (pending.outgoing.some(o => o.receiverId === uid)) return 'pending';
    if (pending.incoming.includes(uid)) return 'incoming';
    return 'none';
  };

  return (
    <div className="flex flex-col h-full pb-16">
      <div className="px-4 pt-10 pb-3" style={{ borderBottom: '1px solid #252535' }}>
        <div className="font-mono text-[10px] tracking-widest mb-0.5" style={{ color: '#6B6B8A' }}>SYS://SCAN</div>
        <h1 className="font-heading text-2xl font-bold tracking-wider" style={{ color: '#00F5FF', textShadow: '0 0 15px rgba(0,245,255,0.3)' }}>SCAN</h1>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center gap-2 px-3 py-3 rounded-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B8A" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            className="flex-1 bg-transparent outline-none font-body text-sm"
            style={{ color: '#E8E8FF' }}
            placeholder="Search operators by name or username..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && <button onClick={() => setQuery('')} style={{ color: '#6B6B8A' }}>✕</button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {loading && (
          <div className="flex justify-center py-8"><div className="flex gap-1"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div></div>
        )}

        {!loading && query.length >= 2 && results.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-3">
            <span style={{ fontSize: 32 }}>🔍</span>
            <span className="font-mono text-xs tracking-widest" style={{ color: '#6B6B8A' }}>NO OPERATORS FOUND</span>
          </div>
        )}

        {!loading && query.length < 2 && (
          <div className="flex flex-col items-center py-16 gap-3 opacity-50">
            <span style={{ fontSize: 40 }}>📡</span>
            <span className="font-mono text-xs tracking-widest text-center" style={{ color: '#6B6B8A' }}>TYPE 2+ CHARS TO INITIATE SCAN</span>
          </div>
        )}

        {results.map((u) => {
          const status = getStatus(u._id);
          return (
            <div key={u._id} className="flex items-center gap-3 py-3 holo-hover" style={{ borderBottom: '1px solid #1A1A26' }}>
              <Avatar user={u} size={42} showStatus />
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-sm truncate" style={{ color: '#E8E8FF' }}>{u.displayName || u.username}</p>
                <p className="font-mono text-[10px] tracking-widest" style={{ color: '#6B6B8A' }}>@{u.username}</p>
              </div>
              {status === 'friends' && (
                <span className="px-3 py-1.5 rounded-sm font-mono text-[10px]" style={{ background: 'rgba(6,214,160,0.1)', border: '1px solid rgba(6,214,160,0.3)', color: '#06D6A0' }}>LINKED</span>
              )}
              {status === 'pending' && (
                <span className="px-3 py-1.5 rounded-sm font-mono text-[10px]" style={{ background: 'rgba(255,183,3,0.1)', border: '1px solid rgba(255,183,3,0.3)', color: '#FFB703' }}>PENDING</span>
              )}
              {status === 'incoming' && (
                <span className="px-3 py-1.5 rounded-sm font-mono text-[10px]" style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.3)', color: '#00F5FF' }}>RESPOND</span>
              )}
              {status === 'none' && (
                <button
                  onClick={() => addFriend(u._id)}
                  disabled={actioning[u._id]}
                  className="px-3 py-1.5 rounded-sm font-mono text-[10px] transition-all"
                  style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.3)', color: '#00F5FF', opacity: actioning[u._id] ? 0.5 : 1 }}
                >
                  + LINK
                </button>
              )}
            </div>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}
