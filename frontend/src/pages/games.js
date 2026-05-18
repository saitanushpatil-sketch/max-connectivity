import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import BottomNav from '../components/ui/BottomNav';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import Skeleton from '../components/ui/Skeleton';
import Game2048 from '../components/games/Game2048';
import TicTacToe from '../components/games/TicTacToe';
import DesiQuiz from '../components/games/DesiQuiz';
import ReactionTest from '../components/games/ReactionTest';
import CarRacer from '../components/games/CarRacer';
import SpaceShooter from '../components/games/SpaceShooter';
import api from '../utils/api';
import hapticTap from '../utils/haptic';

const GAMES = [
  { key: '2048', label: '2048', genre: 'PUZZLE', icon: '2048', statKey: 'game2048HighScore', format: (v) => v || 0, color: '#00F5FF', new: false },
  { key: 'reaction', label: 'SPEED TAP', genre: 'REFLEX', icon: '⚡', statKey: 'reactionBestAvg', format: (v) => (v ? `${v}ms` : '—'), color: '#06D6A0', new: false },
  { key: 'desi', label: 'DESI QUIZ', genre: 'TRIVIA', icon: '🎬', statKey: 'desiQuizHighScore', format: (v) => `${v || 0}/10`, color: '#FFB703', new: false },
  { key: 'ttt', label: 'TIC TAC TOE', genre: 'STRATEGY', icon: '✕○', statKey: 'tttWins', format: (v) => `${v || 0} wins`, color: '#FF006E', new: false },
  { key: 'car', label: 'CAR RACER', genre: 'ARCADE', icon: '🏎️', statKey: 'carRacerHighScore', format: (v) => v || 0, color: '#F97316', new: true },
  { key: 'space', label: 'SPACE SHOOTER', genre: 'SHMUP', icon: '🚀', statKey: 'spaceShooterHighScore', format: (v) => v || 0, color: '#8B5CF6', new: true },
];

const GAME_COMPONENTS = {
  2048: Game2048,
  ttt: TicTacToe,
  desi: DesiQuiz,
  reaction: ReactionTest,
  car: CarRacer,
  space: SpaceShooter,
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

  const goBack = useCallback(() => {
    hapticTap(6);
    setActiveGame(null);
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && activeGame) goBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeGame, goBack]);

  const selectGame = (key) => {
    hapticTap(8);
    setActiveGame(key);
  };

  const ActiveComponent = activeGame ? GAME_COMPONENTS[activeGame] : null;
  const isHost = router.query.host !== '0';

  return (
    <div className="flex flex-col h-full pb-16 overflow-hidden">
      <div className="px-4 pt-10 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid #252535' }}>
        {activeGame && (
          <button
            type="button"
            onClick={goBack}
            className="w-9 h-9 flex items-center justify-center rounded-sm flex-shrink-0 mb-2"
            style={{ border: '1px solid #252535', color: '#00F5FF' }}
            aria-label="Back"
          >
            ←
          </button>
        )}
        <div className="font-mono text-[10px] tracking-widest mb-0.5" style={{ color: '#6B6B8A' }}>ARCADE // MAX GAMES</div>
        <h1 className="font-heading text-3xl font-bold tracking-wider" style={{ color: '#00F5FF', textShadow: '0 0 18px rgba(0,245,255,0.35)', fontFamily: 'Rajdhani, sans-serif' }}>
          {activeGame ? GAMES.find((g) => g.key === activeGame)?.label : 'MAX GAMES'}
        </h1>
        {!activeGame && (
          <p className="font-mono text-xs tracking-widest mt-1" style={{ color: '#6B6B8A' }}>// SELECT MISSION</p>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {!activeGame ? (
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} height={160} className="rounded-sm" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {GAMES.map((game) => (
                  <button
                    key={game.key}
                    type="button"
                    onClick={() => selectGame(game.key)}
                    className="relative text-left p-4 rounded-sm corner-brackets transition-transform active:scale-[0.97] hover:shadow-[0_0_20px_rgba(0,245,255,0.12)]"
                    style={{ background: '#12121A', border: `1px solid ${game.color}44` }}
                  >
                    {game.new && (
                      <span className="absolute top-2 right-2 font-mono text-[8px] px-1.5 py-0.5 rounded-sm" style={{ background: '#FF006E22', color: '#FF006E', border: '1px solid #FF006E55' }}>NEW</span>
                    )}
                    <div className="h-14 flex items-center justify-center font-heading text-2xl mb-2" style={{ color: game.color, textShadow: `0 0 12px ${game.color}55` }}>
                      {game.icon}
                    </div>
                    <h2 className="font-heading text-base font-bold tracking-wider" style={{ color: game.color, fontFamily: 'Rajdhani, sans-serif' }}>
                      {game.label}
                    </h2>
                    <p className="font-mono text-[9px] mt-1 tracking-widest" style={{ color: '#6B6B8A' }}>{game.genre}</p>
                    <p className="font-mono text-[10px] mt-3" style={{ color: '#FFB703' }}>⭐ BEST: {game.format(stats[game.statKey])}</p>
                    <span className="inline-block mt-3 font-mono text-[10px] px-3 py-1.5 rounded-sm" style={{ background: `${game.color}18`, border: `1px solid ${game.color}`, color: game.color }}>
                      PLAY →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-4">
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
                        isHost,
                      }
                    : {})}
                />
              )}
            </ErrorBoundary>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
