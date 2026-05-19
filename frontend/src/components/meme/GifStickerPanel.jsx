import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';

const SEARCH_PRESETS = [
  { label: '🔥 Trending', query: '', emoji: '🔥' },
  { label: '😂 Funny', query: 'funny', emoji: '😂' },
  { label: '💃 Bollywood', query: 'bollywood dance', emoji: '💃' },
  { label: '🎬 Telugu', query: 'telugu movie', emoji: '🎬' },
  { label: '😎 Attitude', query: 'attitude swag', emoji: '😎' },
  { label: '❤️ Love', query: 'love heart', emoji: '❤️' },
  { label: '😤 Angry', query: 'angry', emoji: '😤' },
  { label: '🎉 Celebrate', query: 'celebration', emoji: '🎉' },
  { label: '👏 Clap', query: 'clapping', emoji: '👏' },
  { label: '🤣 LOL', query: 'laughing', emoji: '🤣' },
  { label: '😴 Bored', query: 'bored', emoji: '😴' },
  { label: '🙏 Namaste', query: 'namaste india', emoji: '🙏' },
];

export default function GifStickerPanel({ onSelect, onClose }) {
  const [tab, setTab] = useState('gifs');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [activePreset, setActivePreset] = useState(0);
  const loaderRef = useRef(null);
  const searchTimer = useRef(null);
  const fetchingRef = useRef(false);

  const fetchItems = useCallback(async (q, off, type, reset) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const endpoint = q
        ? `/memes/gifs/search?q=${encodeURIComponent(q)}&type=${type}&offset=${off}&limit=20`
        : `/memes/gifs/trending?type=${type}&limit=20`;
      const { data } = await api.get(endpoint);
      const newItems = data.items || [];
      setItems((prev) => (reset ? newItems : [...prev, ...newItems]));
      setOffset(off + newItems.length);
      setHasMore(data.hasMore !== false && newItems.length === 20);
    } catch {
      if (reset) setItems([]);
    }
    setLoading(false);
    fetchingRef.current = false;
  }, []);

  // Reload on tab change
  useEffect(() => {
    setItems([]);
    setOffset(0);
    setHasMore(true);
    setSearch('');
    setActivePreset(0);
    fetchItems('', 0, tab, true);
  }, [tab]); // eslint-disable-line

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setItems([]);
      setOffset(0);
      setHasMore(true);
      fetchItems(search, 0, tab, true);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]); // eslint-disable-line

  // Infinite scroll
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore && items.length > 0) {
          fetchItems(search, offset, tab, false);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, hasMore, offset, search, tab, items.length, fetchItems]);

  const handlePreset = (preset, idx) => {
    setActivePreset(idx);
    setSearch(preset.query);
  };

  const isSticker = tab === 'stickers';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 98,
          background: 'rgba(0,0,0,0.55)',
        }}
      />

      {/* Slide-up panel */}
      <style>{`
        @keyframes gifPanelUp {
          from { transform: translateX(-50%) translateY(100%); }
          to   { transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      <div style={{
        position: 'fixed', bottom: 0,
        left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 448,
        height: '65vh', zIndex: 99,
        background: '#0A0A0F',
        borderTop: '1px solid rgba(0,245,255,0.2)',
        borderRadius: '20px 20px 0 0',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -8px 40px rgba(0,245,255,0.1)',
        animation: 'gifPanelUp 0.3s cubic-bezier(0.32,0.72,0,1)',
        overflow: 'hidden',
      }}>

        {/* Handle bar */}
        <div style={{
          width: 36, height: 4, background: '#252535',
          borderRadius: 2, margin: '12px auto 0', flexShrink: 0,
        }} />

        {/* Tabs + Close */}
        <div style={{
          display: 'flex', padding: '8px 12px',
          gap: 8, flexShrink: 0, alignItems: 'center',
        }}>
          {['gifs', 'stickers'].map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '8px 0',
              background: tab === t ? 'rgba(0,245,255,0.12)' : '#12121A',
              border: `1px solid ${tab === t ? '#00F5FF' : '#252535'}`,
              borderRadius: 8, cursor: 'pointer',
              color: tab === t ? '#00F5FF' : '#6B6B8A',
              fontFamily: 'Rajdhani, sans-serif',
              fontWeight: 700, fontSize: 14, letterSpacing: '0.1em',
              transition: 'all 0.2s',
              boxShadow: tab === t ? '0 0 12px rgba(0,245,255,0.2)' : 'none',
            }}>
              {t === 'gifs' ? '🎬 GIFs' : '✨ STICKERS'}
            </button>
          ))}
          <button onClick={onClose} style={{
            width: 38, height: 38, borderRadius: 8,
            background: '#1A1A26', border: '1px solid #252535',
            color: '#6B6B8A', cursor: 'pointer', fontSize: 16,
            flexShrink: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Search bar */}
        <div style={{ padding: '0 12px 8px', flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#12121A', border: '1px solid #252535',
            borderRadius: 10, padding: '8px 12px',
          }}>
            <span style={{ fontSize: 14 }}>🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isSticker ? 'Search stickers...' : 'Search GIFs... bollywood, funny...'}
              style={{
                flex: 1, background: 'none', border: 'none',
                outline: 'none', color: '#E8E8FF',
                fontSize: 14, fontFamily: 'Exo 2, sans-serif',
              }}
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch('')} style={{
                background: 'none', border: 'none',
                color: '#6B6B8A', cursor: 'pointer', fontSize: 16, lineHeight: 1,
              }}>✕</button>
            )}
          </div>
        </div>

        {/* Preset pills */}
        <div style={{
          display: 'flex', gap: 6, padding: '0 12px 8px',
          overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0,
        }}>
          {SEARCH_PRESETS.map((p, i) => (
            <button key={i} onClick={() => handlePreset(p, i)} style={{
              flexShrink: 0, padding: '5px 10px',
              background: activePreset === i && !search
                ? 'rgba(0,245,255,0.12)' : '#12121A',
              border: `1px solid ${activePreset === i && !search ? '#00F5FF' : '#252535'}`,
              borderRadius: 20,
              color: activePreset === i && !search ? '#00F5FF' : '#6B6B8A',
              fontSize: 11, cursor: 'pointer',
              fontFamily: 'Share Tech Mono, monospace',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Grid content */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '0 8px 8px',
          WebkitOverflowScrolling: 'touch',
        }}>
          {loading && items.length === 0 ? (
            /* Skeleton */
            <div style={{
              display: 'grid',
              gridTemplateColumns: isSticker ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
              gap: 6,
            }}>
              {[...Array(isSticker ? 8 : 6)].map((_, i) => (
                <div key={i} style={{
                  aspectRatio: isSticker ? '1' : '4/3',
                  background: '#12121A', borderRadius: 8,
                  animation: 'pulse 1.5s ease-in-out infinite',
                }} />
              ))}
            </div>
          ) : items.length === 0 && !loading ? (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              height: '80%', gap: 8,
            }}>
              <span style={{ fontSize: 40 }}>{isSticker ? '✨' : '🎬'}</span>
              <p style={{
                fontFamily: 'Share Tech Mono, monospace', fontSize: 12,
                color: '#6B6B8A', textAlign: 'center',
              }}>
                NO {tab.toUpperCase()} FOUND
              </p>
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isSticker ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
                gap: 6,
              }}>
                {items.map((item) => (
                  <button key={item.id} onClick={() => onSelect(item)} style={{
                    border: '1px solid #252535', borderRadius: 8,
                    overflow: 'hidden', cursor: 'pointer',
                    background: isSticker ? 'transparent' : '#12121A',
                    padding: 0, position: 'relative',
                    aspectRatio: isSticker ? '1' : '4/3',
                    transition: 'transform 0.1s, border-color 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0,245,255,0.4)';
                    e.currentTarget.style.transform = 'scale(1.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#252535';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}>
                    <img
                      src={item.preview || item.url}
                      alt={item.title || 'GIF'}
                      loading="lazy"
                      decoding="async"
                      style={{
                        width: '100%', height: '100%',
                        objectFit: isSticker ? 'contain' : 'cover',
                        display: 'block',
                      }}
                      onError={(e) => {
                        if (item.url && e.target.src !== item.url) e.target.src = item.url;
                        else e.target.style.display = 'none';
                      }}
                    />
                  </button>
                ))}
              </div>
              {/* Infinite scroll sentinel */}
              <div ref={loaderRef} style={{ height: 24 }} />
              {loading && items.length > 0 && (
                <div style={{
                  textAlign: 'center', padding: 12,
                  color: '#6B6B8A', fontFamily: 'Share Tech Mono, monospace',
                  fontSize: 10, letterSpacing: 2,
                }}>
                  LOADING MORE...
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
