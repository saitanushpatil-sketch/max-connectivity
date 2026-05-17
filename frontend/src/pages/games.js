import { useState } from 'react';
import BottomNav from '../components/ui/BottomNav';
import MemeQuiz from '../components/games/MemeQuiz';
import ReactionTest from '../components/games/ReactionTest';
import MemeMatch from '../components/games/MemeMatch';

const TABS = [
  { key: 'quiz', label: 'MEME QUIZ', icon: '🧠' },
  { key: 'reaction', label: 'REACTION', icon: '⚡' },
  { key: 'match', label: 'MEME MATCH', icon: '🎴' },
];

export default function GamesPage() {
  const [tab, setTab] = useState('quiz');

  return (
    <div className="flex flex-col h-full pb-16">
      <div className="px-4 pt-10 pb-3" style={{ borderBottom: '1px solid #252535' }}>
        <div className="font-mono text-[10px] tracking-widest mb-0.5" style={{ color: '#6B6B8A' }}>SYS://ARCADE</div>
        <h1 className="font-heading text-2xl font-bold tracking-wider" style={{ color: '#00F5FF', textShadow: '0 0 15px rgba(0,245,255,0.3)' }}>
          MINI GAMES
        </h1>
      </div>

      <div className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ borderBottom: '1px solid #252535' }}>
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className="flex-shrink-0 px-3 py-2 rounded-sm font-mono text-[10px] tracking-widest"
            style={{
              background: tab === key ? 'rgba(0,245,255,0.12)' : '#12121A',
              border: `1px solid ${tab === key ? '#00F5FF' : '#252535'}`,
              color: tab === key ? '#00F5FF' : '#6B6B8A',
            }}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {tab === 'quiz' && <MemeQuiz />}
        {tab === 'reaction' && <ReactionTest />}
        {tab === 'match' && <MemeMatch />}
      </div>

      <BottomNav />
    </div>
  );
}
