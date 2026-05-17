import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import BottomNav from '../components/ui/BottomNav';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import Skeleton from '../components/ui/Skeleton';
import Snake from '../components/games/Snake';
import Game2048 from '../components/games/Game2048';
import SimonSays from '../components/games/SimonSays';
import WhackAMole from '../components/games/WhackAMole';
import TypeRacer from '../components/games/TypeRacer';
import Wordle from '../components/games/Wordle';
import FlappyBird from '../components/games/FlappyBird';
import TicTacToe from '../components/games/TicTacToe';
import DesiQuiz from '../components/games/DesiQuiz';
import ReactionTest from '../components/games/ReactionTest';
import api from '../utils/api';
import hapticTap from '../utils/haptic';

const GAMES = [
  { key: 'snake', label: 'SNAKE', icon: '🐍', color: '#00F5FF', statKey: 'snakeHighScore', format: (v) => v || 0 },
  { key: '2048', label: '2048', icon: '🔢', color: '#FFB703', statKey: 'game2048HighScore', format: (v) => v || 0 },
  { key: 'simon', label: 'SIMON SAYS', icon: '🎵', color: '#06D6A0', statKey: 'simonHighScore', format: (v) => v || 0 },
  { key: 'whack', label: 'WHACK-A-BOT', icon: '🤖', color: '#FF006E', statKey: 'whackHighScore', format: (v) => v || 0 },
  { key: 'typer', label: 'TYPE RACER', icon: '⌨️', color: '#00F5FF', statKey: 'typerBestWpm', format: (v) => (v ? `${v} WPM` : '—') },
  { key: 'wordle', label: 'WORDLE', icon: '📝', color: '#06D6A0', statKey: 'wordleHighScore', format: (v) => (v ? `${v}/6` : '—') },
  { key: 'flappy', label: 'FLAPPY MAX', icon: '🦅', color: '#00F5FF', statKey: 'flappyHighScore', format: (v) => v || 0 },
  { key: 'ttt', label: 'TIC TAC TOE', icon: '⭕', color: '#FF006E', statKey: 'tttWins', format: (v) => `${v || 0} wins` },
  { key: 'desi', label: 'DESI QUIZ', icon: '🎬', color: '#FFB703', statKey: 'desiQuizHighScore', format: (v) => `${v || 0}/10` },
  { key: 'reaction', label: 'SPEED TAP', icon: '⚡', color: '#06D6A0', statKey: 'reactionBestAvg', format: (v) => (v ? `${v}ms` : '—') },
];

const GAME_COMPONENTS = {
  snake: Snake,
  2048: Game2048,
  simon: SimonSays,
  whack: WhackAMole,
  typer: TypeRacer,
  wordle: Wordle,
  flappy: FlappyBird,
  ttt: TicTacToe,
  desi: DesiQuiz,
  reaction: ReactionTest,
};

export default function GamesPage() {
  const router = useRouter();
  const [activeGame, setActiveGame] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get('/games/stats');
      setStats(data.stats || {});
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (router.query.game && GAME_COMPONENTS[router.query.game]) {
      setActiveGame(router.query.game);
    }
  }, [router.query.game]);

  const selectGame = (key) => {
    hapticTap(8);
    setActiveGame(key);
  };

  const goBack = () => {
    hapticTap(6);
    setActiveGame(null);
    loadStats();
  };

  const ActiveComponent = activeGame ? GAME_COMPONENTS[activeGame] : null;

  return (
    <div className="flex flex-col h-full pb-16">
      <div className="px-4 pt-10 pb-3 flex items-center gap-3" style={{ borderBottom: '1px solid #252535' }}>
        {activeGame && (
          <button
            type="button"
            onClick={goBack}
            className="w-9 h-9 flex items-center justify-center rounded-sm flex-shrink-0"
            style={{ border: '1px solid #252535', color: '#00F5FF' }}
            aria-label="Back"
          >
            ←
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10px] tracking-widest mb-0.5" style={{ color: '#6B6B8A' }}>
            SYS://ARCADE
          </div>
          <h1
            className="font-heading text-2xl font-bold tracking-wider truncate"
            style={{ color: '#00F5FF', textShadow: '0 0 15px rgba(0,245,255,0.3)' }}
          >
            {activeGame ? GAMES.find((g) => g.key === activeGame)?.label : 'MINI GAMES'}
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        {!activeGame ? (
          loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={140} className="rounded-sm" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {GAMES.map((game) => (
                <button
                  key={game.key}
                  type="button"
                  onClick={() => selectGame(game.key)}
                  className="game-card p-3 rounded-sm text-left corner-brackets active:scale-[0.98] transition-transform"
                  style={{ background: '#12121A', border: `1px solid ${game.color}33` }}
                >
                  <span className="text-2xl block mb-2" style={{ filter: `drop-shadow(0 0 8px ${game.color})` }}>
                    {game.icon}
                  </span>
                  <h2 className="font-heading text-sm font-bold tracking-wider truncate" style={{ color: game.color }}>
                    {game.label}
                  </h2>
                  <p className="font-mono text-[9px] mt-1" style={{ color: '#6B6B8A' }}>
                    BEST: {game.format(stats[game.statKey])}
                  </p>
                  <span
                    className="inline-block mt-2 font-mono text-[9px] px-2 py-0.5 rounded-sm"
                    style={{ background: `${game.color}15`, border: `1px solid ${game.color}`, color: game.color }}
                  >
                    PLAY
                  </span>
                </button>
              ))}
            </div>
          )
        ) : (
          <ErrorBoundary fallbackMessage="Game module failed to load.">
            {ActiveComponent && (
              <ActiveComponent
                onExit={goBack}
                onScoreSaved={loadStats}
                {...(activeGame === 'ttt' && router.query.opponent
                  ? {
                      socketMode: true,
                      challengeId: router.query.opponent,
                      opponentName: router.query.name || 'Friend',
                      isHost: true,
                    }
                  : {})}
              />
            )}
          </ErrorBoundary>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
