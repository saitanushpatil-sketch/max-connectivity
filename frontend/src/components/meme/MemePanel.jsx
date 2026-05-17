import { useState, useMemo } from 'react';
import Image from 'next/image';
import { MEME_TEMPLATES, MEME_CATEGORIES } from './templates';
import MemeEditor from './MemeEditor';

export default function MemePanel({ searchQuery = '', onSelect, onClose }) {
  const [category, setCategory] = useState('All');
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [editorTemplate, setEditorTemplate] = useState(null);

  const filtered = useMemo(() => {
    return MEME_TEMPLATES.filter((t) => {
      const matchCat = category === 'All' || t.category === category;
      const q = localSearch.trim().toLowerCase();
      const matchSearch = !q || t.name.toLowerCase().includes(q) || t.id.includes(q);
      return matchCat && matchSearch;
    });
  }, [category, localSearch]);

  if (editorTemplate) {
    return (
      <MemeEditor
        template={editorTemplate}
        onCancel={() => setEditorTemplate(null)}
        onSend={async (base64, name) => {
          await onSelect?.({ name, base64 });
          setEditorTemplate(null);
        }}
      />
    );
  }

  return (
    <div
      className="flex flex-col meme-panel-enter"
      style={{ background: '#0A0A0F', borderTop: '1px solid #252535', height: 340 }}
    >
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <div
          className="flex items-center gap-2 flex-1 px-3 py-2 rounded-sm"
          style={{ background: '#12121A', border: '1px solid #252535' }}
        >
          <span style={{ color: '#6B6B8A', fontSize: 14 }}>🔍</span>
          <input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="SEARCH TEMPLATES..."
            className="flex-1 bg-transparent outline-none font-mono text-sm"
            style={{ color: '#E8E8FF', fontSize: 13, letterSpacing: '0.05em' }}
          />
          {localSearch && (
            <button type="button" onClick={() => setLocalSearch('')} style={{ color: '#6B6B8A', fontSize: 12 }}>✕</button>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-sm font-mono text-xs"
          style={{ background: '#1A1A26', border: '1px solid #252535', color: '#6B6B8A' }}
        >
          ✕
        </button>
      </div>

      <div className="flex gap-2 px-3 pb-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {MEME_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
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

      <div className="px-3 pb-1">
        <span className="font-mono text-[10px] tracking-widest" style={{ color: '#6B6B8A' }}>
          {localSearch ? `RESULTS FOR "${localSearch.toUpperCase()}"` : '// LOCAL TEMPLATES'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span style={{ fontSize: 32 }}>🎭</span>
            <span className="font-mono text-xs tracking-widest" style={{ color: '#6B6B8A' }}>NO TEMPLATES FOUND</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filtered.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setEditorTemplate(template)}
                className="relative group rounded-sm overflow-hidden aspect-square"
                style={{ background: '#12121A', border: '1px solid #252535' }}
              >
                <Image
                  src={template.src}
                  alt={template.name}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="120px"
                />
                <div
                  className="absolute inset-x-0 bottom-0 p-1"
                  style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.85))' }}
                >
                  <span className="font-mono text-[8px] text-white leading-tight line-clamp-2">{template.name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
