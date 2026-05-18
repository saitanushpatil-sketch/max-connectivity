import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import BottomNav from '../components/ui/BottomNav';
import MemeEditor from '../components/meme/MemeEditor';
import api from '../utils/api';
import hapticTap from '../utils/haptic';
import useAuthStore from '../context/authStore';

const CATEGORIES = ['All', 'Trending 🔥', 'Telugu', 'Hindi', 'English', 'Desi', 'Wholesome', 'Dark', 'Templates', 'Random'];

export default function MemesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [memes, setMemes] = useState([]);
  const [trending, setTrending] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [editorTemplate, setEditorTemplate] = useState(null);
  const [shareMeme, setShareMeme] = useState(null); // meme object to share
  const [friends, setFriends] = useState([]);
  const observerRef = useRef();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    api.get('/friends').then(res => setFriends(res.data.friends || [])).catch(() => {});
  }, []);

  const mapGif = (g) => ({
    _id: g.id,
    name: g.title,
    url: g.url,
    preview: g.preview,
  });

  const fetchMemes = useCallback(async (pageNum, replace = false) => {
    setLoading(true);
    try {
      const isSearch = debouncedSearch.trim().length > 0;
      const isTrendingCat = category === 'Trending 🔥';
      const isRandomCat = category === 'Random';

      let data;
      if (isRandomCat && !isSearch) {
        const typeMap = { Telugu: 'tfi', Hindi: 'hindi', English: 'english', Desi: 'hindi' };
        const type = typeMap[category] || 'english';
        ({ data } = await api.get(`/memes/collection?type=${type}`));
      } else if (isSearch || (category !== 'All' && !isTrendingCat)) {
        const q = isSearch ? debouncedSearch : category;
        ({ data } = await api.get(`/memes/search?q=${encodeURIComponent(q)}&limit=20`));
      } else {
        ({ data } = await api.get('/memes/trending'));
      }

      const items = (data.gifs || []).map(mapGif);
      setMemes((prev) => (replace ? items : [...prev, ...items]));
      setHasMore(!!data.next);
      setTotal(items.length);
    } catch (err) {
      console.error('Fetch GIFs error:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category]);

  useEffect(() => {
    fetchMemes(1, true);
    setPage(1);
  }, [fetchMemes]);

  useEffect(() => {
    if (category === 'All' && !debouncedSearch.trim()) {
      api.get('/memes/trending').then((res) => setTrending((res.data.gifs || []).map(mapGif))).catch(() => {});
    }
  }, [category, debouncedSearch]);

  const lastMemeRef = useCallback(node => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(p => { const next = p + 1; fetchMemes(next); return next; });
      }
    });
    if (node) observerRef.current.observe(node);
  }, [loading, hasMore, fetchMemes]);

  const handleAction = (meme) => {
    hapticTap(10);
    if (meme.isTemplate || meme.source === 'imgflip' || meme.source === 'memegen') {
      setEditorTemplate(meme);
    } else {
      setShareMeme(meme);
    }
  };

  const handleSendToFriend = async (friendId, base64Url, name, memeId) => {
    hapticTap(10);
    try {
      // Find conversation or create
      const { data: convData } = await api.get(`/messages/${friendId}`);
      let convId = convData.conversationId;
      
      // Send via API directly (since socket requires conversation context in component)
      await api.post(`/messages/${friendId}`, {
        content: `Sent a meme: ${name}`,
        type: 'meme',
        memeData: { url: base64Url, name }
      });
      
      if (memeId) await api.post(`/memes/use/${memeId}`).catch(()=>{});
      
      setShareMeme(null);
      setEditorTemplate(null);
      // Optional: show toast here
    } catch (err) {
      console.error('Failed to send', err);
    }
  };

  if (editorTemplate) {
    return (
      <MemeEditor
        template={editorTemplate}
        onCancel={() => setEditorTemplate(null)}
        onSend={(base64, name) => setShareMeme({ url: base64, name, _id: editorTemplate._id, edited: true })}
      />
    );
  }

  const isBrowsing = !debouncedSearch.trim() && category === 'All';

  return (
    <div className="flex flex-col h-full bg-[#0A0A0F] pb-16">
      <style>{`
        .shimmer { background: #1A1A26; background-image: linear-gradient(to right, #1A1A26 0%, #252535 20%, #1A1A26 40%, #1A1A26 100%); background-repeat: no-repeat; animation: shimmer 1.5s linear infinite; background-size: 800px 100%; }
        @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
      `}</style>

      {/* Header */}
      <div className="px-4 pt-10 pb-3 flex-shrink-0 border-b border-[#252535]">
        <div style={{fontFamily:'monospace',fontSize:10,letterSpacing:3,color:'#6B6B8A',marginBottom:2}}>DISCOVER // TRENDING</div>
        <h1 style={{fontFamily:'Rajdhani,sans-serif',fontSize:32,fontWeight:900,color:'#FF006E',textShadow:'0 0 20px rgba(255,0,110,0.35)',letterSpacing:3,lineHeight:1}}>
          🎭 MEMES
        </h1>
        
        {/* Search */}
        <div className="flex items-center gap-2 mt-4 px-3 py-2 rounded-xl bg-[#12121A] border border-[#252535]">
          <span style={{ color: '#6B6B8A', fontSize: 14 }}>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="SEARCH 1000+ MEMES..."
            className="flex-1 bg-transparent outline-none font-mono text-sm text-[#E8E8FF] placeholder-[#6B6B8A]"
          />
          {search && <button onClick={() => setSearch('')} className="text-[#6B6B8A]">✕</button>}
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => { setCategory(cat); setSearch(''); hapticTap(6); }}
            className="flex-shrink-0 px-4 py-1.5 rounded-full font-mono text-xs transition-all border"
            style={{
              background: category === cat ? (cat.includes('🔥') ? 'rgba(255,0,110,0.1)' : 'rgba(0,245,255,0.1)') : '#12121A',
              borderColor: category === cat ? (cat.includes('🔥') ? '#FF006E' : '#00F5FF') : '#252535',
              color: category === cat ? (cat.includes('🔥') ? '#FF006E' : '#00F5FF') : '#6B6B8A',
            }}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-6">
        {/* Trending Horizontal */}
        {isBrowsing && trending.length > 0 && (
          <div className="mb-6">
            <div className="px-2 py-2 font-mono text-[10px] tracking-widest text-[#FFB703]">🔥 TRENDING TODAY</div>
            <div className="flex gap-2 overflow-x-auto px-2 pb-2 snap-x" style={{ scrollbarWidth: 'none' }}>
              {trending.map(meme => (
                <button
                  key={meme._id}
                  onClick={() => handleAction(meme)}
                  className="flex-shrink-0 relative w-48 h-48 rounded-xl overflow-hidden border border-[#252535] snap-start group bg-[#12121A]"
                >
                  <img src={meme.url} alt={meme.name} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black to-transparent">
                    <span className="font-mono text-[10px] text-white line-clamp-2">{meme.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {isBrowsing && <div className="px-2 py-2 font-mono text-[10px] tracking-widest text-[#00F5FF]">✨ FRESH DROPS</div>}
        {!isBrowsing && (
          <div className="px-2 py-2 font-mono text-[10px] tracking-widest text-[#6B6B8A]">
            {total} RESULTS FOUND
          </div>
        )}

        {/* Masonry Grid */}
        <div className="columns-2 gap-2 px-1">
          {memes.map((meme, i) => {
            const isLast = i === memes.length - 1;
            return (
              <button
                key={meme._id}
                ref={isLast ? lastMemeRef : null}
                onClick={() => handleAction(meme)}
                className="relative group w-full mb-2 rounded-xl overflow-hidden border border-[#252535] bg-[#12121A] text-left shimmer block"
              >
                <img 
                  src={meme.url} 
                  alt={meme.name} 
                  className="w-full h-auto opacity-0 transition-opacity duration-300"
                  onLoad={(e) => { e.target.style.opacity = 1; e.target.parentElement.classList.remove('shimmer'); }}
                  loading="lazy" 
                />
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent flex flex-col justify-end min-h-[50%] opacity-0 group-hover:opacity-100">
                  <span className="font-mono text-[9px] text-white line-clamp-3 leading-tight">{meme.name}</span>
                  <div className="mt-1">
                    <span className="text-[#FF006E] text-[8px] font-bold tracking-wider bg-[#FF006E]/20 px-1.5 py-0.5 rounded border border-[#FF006E]/40">
                      {meme.isTemplate ? 'EDIT' : 'SEND'}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        
        {loading && (
          <div className="columns-2 gap-2 px-1 mt-2">
            {[1, 2, 3, 4].map(i => <div key={i} className="w-full h-40 mb-2 rounded-xl shimmer border border-[#252535] inline-block" />)}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {shareMeme && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0A0A0F] border-t border-[#252535] rounded-t-3xl overflow-hidden max-h-[85vh] flex flex-col" style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div className="p-4 border-b border-[#252535] flex justify-between items-center bg-[#12121A]">
              <span className="font-mono text-xs text-[#6B6B8A] tracking-widest">SEND TO...</span>
              <button onClick={() => setShareMeme(null)} className="text-[#E8E8FF]">✕</button>
            </div>
            
            <div className="p-4 flex justify-center bg-[#12121A] border-b border-[#252535]">
              <img src={shareMeme.url} alt="Preview" className="max-h-[30vh] rounded-lg border border-[#252535] object-contain" />
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {friends.length === 0 ? (
                <div className="p-6 text-center font-mono text-sm text-[#6B6B8A]">No friends yet. Add friends to share memes!</div>
              ) : (
                friends.map(f => (
                  <button
                    key={f._id}
                    onClick={() => handleSendToFriend(f._id, shareMeme.url, shareMeme.name, shareMeme._id)}
                    className="w-full flex items-center gap-3 p-3 mb-1 rounded-xl hover:bg-[#1A1A26] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full flex flex-shrink-0 items-center justify-center font-mono font-bold text-[#0A0A0F]" style={{ background: f.avatarColor || '#00F5FF' }}>
                      {f.displayName?.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-mono text-sm text-[#E8E8FF]">{f.displayName}</span>
                      <span className="font-mono text-[10px] text-[#6B6B8A]">@{f.username}</span>
                    </div>
                    <span className="ml-auto text-[#00F5FF] font-mono text-xs border border-[#00F5FF]/30 px-3 py-1 rounded-full">SEND</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
