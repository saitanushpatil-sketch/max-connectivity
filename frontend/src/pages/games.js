import { useState, useEffect, useCallback } from 'react';
import BottomNav from '../components/ui/BottomNav';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import MemeQuiz from '../components/games/MemeQuiz';
import ReactionTest from '../components/games/ReactionTest';
import MemeMatch from '../components/games/MemeMatch';
import api from '../utils/api';
import hapticTap from '../utils/haptic';

const GAMES = [
  {
    key: 'quiz',
    label: 'MEME QUIZ',
    icon: '🧠',
    desc: 'MEDIUM',
    subtitle: 'Name the meme in 10s',
    color: '#00F5FF',
    statKey: 'quizHighScore',
    format: (v) => `${v || 0}/10`,
  },
  {
    key: 'reaction',
    label: 'REACTION TEST',
    icon: '⚡',
    desc: 'HARD',
    subtitle: 'JARVIS response protocol',
    color: '#06D6A0',
    statKey: 'reactionBestAvg',
    format: (v) => (v ? `${v}ms` : '—'),
  },
  {
    key: 'match',
    label: 'MEME MATCH',
    icon: '🎴',
    desc: 'EASY',
    subtitle: '8 pairs memory grid',
    color: '#FFB703',
    statKey: 'memeMatchBestTime',
    format: (v) => (v ? `${v}s` : '—'),
  },
];

function GameIcon({ icon, color, active }) {
  return (
    <span
      className={`game-card-icon ${active ? 'game-card-icon-active' : ''}`}
      style={{ filter: active ? `drop-shadow(0 0 12px ${color})` : 'none' }}
    >
      {icon}
    </span>
  );
}

export default function GamesPage() {
  const [activeGame, setActiveGame] = useState(null);
  const [stats, setStats] = useState({});

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get('/games/stats');
      setStats(data.stats || {});
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const selectGame = (key) => {
    hapticTap(8);
    setActiveGame(key);
  };

  const goBack = () => {
    hapticTap(6);
    setActiveGame(null);
    loadStats();
  };

  const renderGame = () => {
    switch (activeGame) {
      case 'quiz':
        return <MemeQuiz onExit={goBack} onScoreSaved={loadStats} />;
      case 'reaction':
        return <ReactionTest onExit={goBack} onScoreSaved={loadStats} />;
      case 'match':
        return <MemeMatch onExit={goBack} onScoreSaved={loadStats} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full pb-16">
      <div className="px-4 pt-10 pb-3" style={{ borderBottom: '1px solid #252535' }}>
        <div className="font-mono text-[10px] tracking-widest mb-0.5" style={{ color: '#6B6B8A' }}>
          SYS://ARCADE
        </div>
        <div className="flex items-center justify-between gap-2">
          <h1
            className="font-heading text-2xl font-bold tracking-wider"
            style={{ color: '#00F5FF', textShadow: '0 0 15px rgba(0,245,255,0.3)' }}
          >
            {activeGame ? GAMES.find((g) => g.key === activeGame)?.label : 'MINI GAMES'}
          </h1>
          {activeGame && (
            <button
              type="button"
              onClick={goBack}
              className="hud-btn hud-btn-ghost px-3 py-2 rounded-sm text-[10px] font-mono tracking-widest active:scale-95"
            >
              ← BACK
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        {!activeGame ? (
          <div className="flex flex-col gap-4">
            {GAMES.map((game) => (
              <div
                key={game.key}
                className="game-card p-4 rounded-sm corner-brackets"
                style={{
                  background: '#12121A',
                  border: `1px solid ${game.color}33`,
                }}
              >
                <div className="flex items-start gap-4">
                  <GameIcon icon={game.icon} color={game.color} active />
                  <div className="flex-1 min-w-0">
                    <h2
                      className="font-heading text-lg font-bold tracking-wider truncate"
                      style={{ color: game.color }}
                    >
                      {game.label}
                    </h2>
                    <p className="font-mono text-[10px] mt-0.5" style={{ color: '#6B6B8A' }}>
                      {game.subtitle}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className="font-mono text-[9px] px-2 py-0.5 rounded-sm"
                        style={{
                          background: `${game.color}15`,
                          border: `1px solid ${game.color}44`,
                          color: game.color,
                        }}
                      >
                        {game.desc}
                      </span>
                      <span className="font-mono text-[10px]" style={{ color: '#6B6B8A' }}>
                        BEST: {game.format(stats[game.statKey])}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => selectGame(game.key)}
                  className="hud-btn w-full mt-4 py-3 rounded-sm text-xs font-heading font-bold tracking-widest active:scale-95 game-play-btn"
                  style={{
                    background: `linear-gradient(135deg, ${game.color}22 0%, ${game.color}08 100%)`,
                    border: `1px solid ${game.color}`,
                    color: game.color,
                    boxShadow: `0 0 20px ${game.color}33`,
                  }}
                >
                  PLAY
                </button>
              </div>
            ))}
          </div>
        ) : (
          <ErrorBoundary fallbackMessage="Game module failed to load.">
            {renderGame()}
          </ErrorBoundary>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
