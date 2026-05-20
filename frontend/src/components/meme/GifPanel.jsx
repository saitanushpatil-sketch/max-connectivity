import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';

const PRESETS = [
  { label: '🔥 Hot', q: '' },
  { label: '😂 Funny', q: 'funny' },
  { label: '💃 Dance', q: 'dance' },
  { label: '🎬 Bollywood', q: 'bollywood' },
  { label: '😎 Swag', q: 'swag attitude' },
  { label: '❤️ Love', q: 'love' },
  { label: '🤣 LOL', q: 'laughing' },
  { label: '😤 Angry', q: 'angry' },
  { label: '🎉 Party', q: 'celebration' },
  { label: '👏 Clap', q: 'clapping' },
  { label: '🙏 India', q: 'namaste india' },
  { label: '🐱 Cute', q: 'cute' },
];

export default function GifPanel({ onSelect, onClose }) {
  const [tab, setTab] = useState('gifs');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const timer = useRef(null);
  const bottomRef = useRef(null);

  const load = async (q, off, type, reset) => {
    setLoading(true);
    try {
      const { data } = await api.get(
        `/gifs/search?q=${encodeURIComponent(q)}&offset=${off}&limit=20&type=${type}` 
      );
      if (reset) {
        setItems(data.items || []);
      } else {
        setItems(p => [...p, ...(data.items || [])]);
      }
      setOffset(data.next || off + 20);
      setHasMore((data.items || []).length === 20);
    } catch {
      setItems([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load('', 0, tab, true);
  }, [tab]);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      load(query, 0, tab, true);
    }, 400);
  }, [query]);

  useEffect(() => {
    if (!bottomRef.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !loading && hasMore) {
        load(query, offset, tab, false);
      }
    });
    obs.observe(bottomRef.current);
    return () => obs.disconnect();
  }, [loading, hasMore, offset, query, tab]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', flexDirection: 'column',
      justifyContent: 'flex-end',
    }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.6)',
      }} />
      
      {/* Sheet */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: '#0D0D14',
        borderRadius: '16px 16px 0 0',
        border: '1px solid #252535',
        borderBottom: 'none',
        height: '65vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Handle */}
        <div style={{
          width: 32, height: 3, borderRadius: 2,
          background: '#3A3A4A', margin: '10px auto 6px',
          flexShrink: 0,
        }} />

        {/* Tabs */}
        <div style={{
          display: 'flex', padding: '4px 12px',
          gap: 6, flexShrink: 0,
          borderBottom: '1px solid #1A1A26',
        }}>
          {['gifs', 'stickers'].map(t => (
            <button key={t}
              onClick={() => { setTab(t); setQuery(''); }}
              style={{
                flex: 1, padding: '7px 0',
                background: tab === t
                  ? 'rgba(0,245,255,0.12)' : 'transparent',
                border: `1px solid ${tab === t ? '#00F5FF66' : 'transparent'}`,
                borderRadius: 8, cursor: 'pointer',
                color: tab === t ? '#00F5FF' : '#6B6B8A',
                fontFamily: 'Rajdhani',
                fontWeight: 700, fontSize: 13,
                letterSpacing: '0.08em',
              }}>
              {t === 'gifs' ? '🎬 GIFs' : '✨ Stickers'}
            </button>
          ))}
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 8,
            background: '#1A1A26', border: '1px solid #252535',
            color: '#6B6B8A', cursor: 'pointer',
            fontSize: 16, flexShrink: 0,
          }}>✕</button>
        </div>

        {/* Search */}
        <div style={{ padding: '8px 12px 4px', flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#12121A', borderRadius: 8,
            border: '1px solid #252535', padding: '7px 12px',
          }}>
            <span style={{ fontSize: 14 }}>🔍</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`Search ${tab}...`}
              autoFocus
              style={{
                flex: 1, background: 'none', border: 'none',
                outline: 'none', color: '#E8E8FF', fontSize: 14,
                fontFamily: 'Exo 2',
              }}
            />
            {query && (
              <button onClick={() => setQuery('')}
                style={{ background: 'none', border: 'none',
                  color: '#6B6B8A', cursor: 'pointer', fontSize: 14 }}>
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Presets */}
        <div style={{
          display: 'flex', gap: 6, padding: '4px 12px 6px',
          overflowX: 'auto', flexShrink: 0,
          scrollbarWidth: 'none',
        }}>
          {PRESETS.map((p, i) => (
            <button key={i} onClick={() => setQuery(p.q)}
              style={{
                flexShrink: 0, padding: '4px 10px',
                background: query === p.q
                  ? 'rgba(0,245,255,0.12)' : '#12121A',
                border: `1px solid ${query === p.q
                  ? '#00F5FF66' : '#252535'}`,
                borderRadius: 20, cursor: 'pointer',
                color: query === p.q ? '#00F5FF' : '#6B6B8A',
                fontSize: 11, whiteSpace: 'nowrap',
                fontFamily: 'Share Tech Mono',
              }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '4px 8px 8px',
          WebkitOverflowScrolling: 'touch',
        }}>
          {loading && items.length === 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 6,
            }}>
              {Array(8).fill(0).map((_, i) => (
                <div key={i} style={{
                  aspectRatio: '4/3', borderRadius: 8,
                  background: '#12121A',
                  animation: 'shimmer 1.5s infinite',
                }} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div style={{
              height: '100%', display: 'flex',
              flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 8, color: '#6B6B8A',
            }}>
              <span style={{ fontSize: 40 }}>🎬</span>
              <p style={{ fontFamily: 'Share Tech Mono', fontSize: 12 }}>
                NO {tab.toUpperCase()} FOUND
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: tab === 'stickers'
                ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
              gap: 6,
            }}>
              {items.map(item => (
                <button key={item.id}
                  onClick={() => onSelect(item)}
                  style={{
                    border: '1px solid #1A1A26',
                    borderRadius: 8, overflow: 'hidden',
                    cursor: 'pointer', background: '#12121A',
                    padding: 0,
                    aspectRatio: tab === 'stickers' ? '1' : '4/3',
                  }}
                >
                  <img
                    src={item.preview || item.url}
                    alt={item.title}
                    loading="lazy"
                    style={{
                      width: '100%', height: '100%',
                      objectFit: tab === 'stickers'
                        ? 'contain' : 'cover',
                    }}
                    onError={e => {
                      if (item.url !== e.target.src) {
                        e.target.src = item.url;
                      }
                    }}
                  />
                </button>
              ))}
              <div ref={bottomRef} style={{ gridColumn: '1/-1', height: 20 }} />
            </div>
          )}
          {loading && items.length > 0 && (
            <div style={{
              textAlign: 'center', padding: 12,
              color: '#6B6B8A', fontSize: 11,
              fontFamily: 'Share Tech Mono',
            }}>
              LOADING...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
