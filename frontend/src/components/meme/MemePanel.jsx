import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';

const QUICK_CATEGORIES = [
  { label: '🔥 Trending', query: '' },
  { label: '🎬 TFI', query: 'telugu movie' },
  { label: '🎭 Allu Arjun', query: 'allu arjun pushpa' },
  { label: '🦁 RRR', query: 'RRR naatu naatu' },
  { label: '💪 Prabhas', query: 'prabhas baahubali' },
  { label: '🎪 Bollywood', query: 'bollywood funny' },
  { label: '😂 SRK', query: 'shah rukh khan' },
  { label: '🙏 Bhai', query: 'salman khan bhai' },
  { label: '😱 Reaction', query: 'shocked reaction' },
  { label: '🤣 Funny', query: 'funny fail' },
  { label: '💃 Dance', query: 'happy dance' },
  { label: '😎 Deal', query: 'deal with it' },
  { label: '🧠 Mind', query: 'mind blown' },
  { label: '👏 Clap', query: 'slow clap' },
  { label: '😤 Angry', query: 'angry reaction' },
];

export default function MemePanel({ searchQuery, onSelect, onClose }) {
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(searchQuery || '');
  const [activeCategory, setActiveCategory] = useState(0);
  const [nextPos, setNextPos] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef();
  const lastGifRef = useRef();
  const searchTimer = useRef();

  const fetchGifs = useCallback(async (q, pos = '', reset = true) => {
    setLoading(true);
    try {
      const endpoint = q
        ? `/memes/search?q=${encodeURIComponent(q)}&next=${pos}&limit=20`
        : '/memes/trending';
      const { data } = await api.get(endpoint);
      const newGifs = data.gifs || [];
      setGifs((prev) => (reset ? newGifs : [...prev, ...newGifs]));
      setNextPos(data.next || '');
      setHasMore(!!data.next);
    } catch {
      setGifs([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGifs('', '', true);
  }, [fetchGifs]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchGifs(search, '', true);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [search, fetchGifs]);

  useEffect(() => {
    if (!lastGifRef.current || !hasMore) return;
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading) {
        fetchGifs(search, nextPos, false);
      }
    });
    observerRef.current.observe(lastGifRef.current);
    return () => observerRef.current?.disconnect();
  }, [gifs, hasMore, loading, search, nextPos, fetchGifs]);

  const handleCategoryClick = (cat, idx) => {
    setActiveCategory(idx);
    setSearch(cat.query);
    fetchGifs(cat.query, '', true);
  };

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%',
      transform: 'translateX(-50%)',
      width: '100%', maxWidth: 448,
      height: '70vh', zIndex: 100,
      background: '#0A0A0F',
      borderTop: '1px solid #00F5FF44',
      borderRadius: '16px 16px 0 0',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 -4px 40px rgba(0,245,255,0.15)',
    }}>
      <div style={{
        width: 40, height: 4, background: '#252535',
        borderRadius: 2, margin: '12px auto 8px',
      }} />

      <div style={{ padding: '0 12px 8px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#12121A', border: '1px solid #252535',
          borderRadius: 8, padding: '8px 12px',
        }}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search GIFs... allu arjun, bollywood..."
            style={{
              flex: 1, background: 'none', border: 'none',
              outline: 'none', color: '#E8E8FF', fontSize: 14,
              fontFamily: 'Exo 2, sans-serif',
            }}
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', color: '#6B6B8A', cursor: 'pointer', fontSize: 16 }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div style={{
        display: 'flex', gap: 8, padding: '0 12px 8px',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {QUICK_CATEGORIES.map((cat, idx) => (
          <button
            key={cat.label}
            type="button"
            onClick={() => handleCategoryClick(cat, idx)}
            style={{
              flexShrink: 0, padding: '6px 12px',
              background: activeCategory === idx ? 'rgba(0,245,255,0.15)' : '#12121A',
              border: `1px solid ${activeCategory === idx ? '#00F5FF' : '#252535'}`,
              borderRadius: 20, color: activeCategory === idx ? '#00F5FF' : '#6B6B8A',
              fontSize: 12, fontFamily: 'Share Tech Mono, monospace',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px', scrollbarWidth: 'thin' }}>
        {loading && gifs.length === 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ height: 140, background: '#12121A', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : gifs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6B6B8A' }}>
            <div style={{ fontSize: 40 }}>🎭</div>
            <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 12 }}>NO GIFS FOUND</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {gifs.map((gif, idx) => (
              <button
                key={gif.id}
                type="button"
                ref={idx === gifs.length - 1 ? lastGifRef : null}
                onClick={() => onSelect(gif)}
                style={{
                  border: '1px solid #252535', borderRadius: 8,
                  overflow: 'hidden', cursor: 'pointer',
                  background: '#12121A', padding: 0,
                  position: 'relative', aspectRatio: '4/3',
                }}
              >
                <img
                  src={gif.preview || gif.url}
                  alt={gif.title}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </button>
            ))}
          </div>
        )}
        {loading && gifs.length > 0 && (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ color: '#00F5FF', fontFamily: 'Share Tech Mono, monospace', fontSize: 11 }}>
              LOADING MORE...
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, right: 16,
          background: '#1A1A26', border: '1px solid #252535',
          borderRadius: 6, color: '#6B6B8A', width: 28,
          height: 28, cursor: 'pointer', fontSize: 14,
        }}
      >
        ✕
      </button>
    </div>
  );
}
