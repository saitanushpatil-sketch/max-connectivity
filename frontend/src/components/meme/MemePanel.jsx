import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import MemeImage from '../ui/MemeImage';
import SkeletonGrid from '../ui/SkeletonGrid';

const CATEGORIES = ['All', 'Reaction', 'Greeting', 'Emotion', 'Humor', 'Relatable', 'Savage', 'Wholesome', 'Gaming', 'Work', 'College'];

export default function MemePanel({ searchQuery = '', onSelect, onClose }) {
  const [memes, setMemes] = useState([]);
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const fetchMemes = useCallback(async (q, cat) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (cat && cat !== 'All') params.set('category', cat);
      const endpoint = q || cat !== 'All' ? `/memes/search?${params}` : '/memes/trending';
      const { data } = await api.get(endpoint);
      setMemes(data.memes || []);
    } catch {
      setMemes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => fetchMemes(localSearch, category), 300);
    return () => clearTimeout(timer);
  }, [localSearch, category, fetchMemes]);

  return (
    <div
      className="flex flex-col meme-panel-enter"
      style={{
        background: '#0A0A0F',
        borderTop: '1px solid #252535',
        height: 340,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <div
          className="flex items-center gap-2 flex-1 px-3 py-2 rounded-sm"
          style={{ background: '#12121A', border: '1px solid #252535' }}
        >
          <span style={{ color: '#6B6B8A', fontSize: 14 }}>🔍</span>
          <input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="SEARCH MEMES..."
            className="flex-1 bg-transparent outline-none font-mono text-sm"
            style={{ color: '#E8E8FF', fontSize: 13, letterSpacing: '0.05em' }}
            autoFocus
          />
          {localSearch && (
            <button onClick={() => setLocalSearch('')} style={{ color: '#6B6B8A', fontSize: 12 }}>✕</button>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-sm font-mono text-xs"
          style={{ background: '#1A1A26', border: '1px solid #252535', color: '#6B6B8A' }}
        >
          ✕
        </button>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 px-3 pb-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className="flex-shrink-0 px-3 py-1 rounded-sm font-mono text-xs transition-all"
            style={{
              background: category === cat ? 'rgba(0,245,255,0.15)' : '#12121A',
              border: `1px solid ${category === cat ? '#00F5FF' : '#252535'}`,
              color: category === cat ? '#00F5FF' : '#6B6B8A',
              letterSpacing: '0.06em',
            }}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Section label */}
      <div className="px-3 pb-1">
        <span className="font-mono text-[10px] tracking-widest" style={{ color: '#6B6B8A' }}>
          {localSearch ? `RESULTS FOR "${localSearch.toUpperCase()}"` : '// TRENDING'}
        </span>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {loading ? (
          <SkeletonGrid count={9} cols={3} />
        ) : memes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span style={{ fontSize: 32 }}>🎭</span>
            <span className="font-mono text-xs tracking-widest" style={{ color: '#6B6B8A' }}>NO MEMES FOUND</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {memes.map((meme) => (
              <button
                key={meme._id}
                onClick={() => onSelect(meme)}
                className="relative group rounded-sm overflow-hidden aspect-square"
                style={{ background: '#12121A', border: '1px solid #252535' }}
              >
                <MemeImage
                  src={meme.url}
                  alt={meme.name}
                  fill
                  className="w-full h-full transition-transform group-hover:scale-105"
                />
                <div
                  className="absolute inset-0 flex items-end opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}
                >
                  <span className="font-mono text-[9px] text-white leading-tight line-clamp-2">{meme.name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
