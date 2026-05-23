import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import BottomNav from '../components/ui/BottomNav';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import Scoreboard from '../components/games/Scoreboard';
import api from '../utils/api';
import hapticTap from '../utils/haptic';

const GameLoader = () => (
  <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-4">
    <div style={{
      width: 40, height: 40,
      border: '2px solid rgba(0,245,255,0.2)',
      borderTopColor: '#00F5FF',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
    <span className="font-mono text-xs tracking-widest text-[#00F5FF]">LOADING MISSION...</span>
  </div>
);

const Game2048 = dynamic(() => import('../components/games/Game2048'), { ssr: false, loading: () => <GameLoader /> });
const TicTacToe = dynamic(() => import('../components/games/TicTacToe'), { ssr: false, loading: () => <GameLoader /> });
const ReactionTest = dynamic(() => import('../components/games/ReactionTest'), { ssr: false, loading: () => <GameLoader /> });
const Snake = dynamic(() => import('../components/games/Snake'), { ssr: false, loading: () => <GameLoader /> });
const SimonSays = dynamic(() => import('../components/games/SimonSays'), { ssr: false, loading: () => <GameLoader /> });
const WhackAMole = dynamic(() => import('../components/games/WhackAMole'), { ssr: false, loading: () => <GameLoader /> });
const TypeRacer = dynamic(() => import('../components/games/TypeRacer'), { ssr: false, loading: () => <GameLoader /> });
const Wordle = dynamic(() => import('../components/games/Wordle'), { ssr: false, loading: () => <GameLoader /> });
const FlappyBird = dynamic(() => import('../components/games/FlappyBird'), { ssr: false, loading: () => <GameLoader /> });
const Cryptogram = dynamic(() => import('../components/games/Cryptogram'), { ssr: false, loading: () => <GameLoader /> });

const GAMES = [
  {
    key: 'reaction-test', label: 'SPEED TAP', genre: 'REFLEX',
    format: (v) => (v ? `${v}ms` : '—'), color: '#06D6A0', diff: 1,
    art: () => <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}><div style={{fontSize:40,filter:'drop-shadow(0 0 12px #06D6A0)'}}>⚡</div></div>,
  },
  {
    key: 'snake', label: 'NEON SNAKE', genre: 'ARCADE',
    format: (v) => v || 0, color: '#00F5FF', diff: 2, isNew: true,
    art: () => <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}><div style={{fontSize:40,filter:'drop-shadow(0 0 12px #00F5FF)'}}>🐍</div></div>,
  },
  {
    key: '2048', label: '2048', genre: 'PUZZLE',
    format: (v) => v || 0, color: '#FFB703', diff: 2,
    art: () => <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}><div style={{fontSize:40,filter:'drop-shadow(0 0 12px #FFB703)'}}>🔢</div></div>,
  },
  {
    key: 'simon-says', label: 'SIMON SAYS', genre: 'MEMORY',
    format: (v) => v || 0, color: '#FF006E', diff: 2, isNew: true,
    art: () => <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}><div style={{fontSize:40,filter:'drop-shadow(0 0 12px #FF006E)'}}>🧠</div></div>,
  },
  {
    key: 'whack-a-mole', label: 'WHACK-A-MOLE', genre: 'ACTION',
    format: (v) => v || 0, color: '#F97316', diff: 1, isNew: true,
    art: () => <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}><div style={{fontSize:40,filter:'drop-shadow(0 0 12px #F97316)'}}>🔨</div></div>,
  },
  {
    key: 'type-racer', label: 'TYPE RACER', genre: 'TYPING',
    format: (v) => v ? `${v} WPM` : '0 WPM', color: '#8B5CF6', diff: 3, isNew: true,
    art: () => <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}><div style={{fontSize:40,filter:'drop-shadow(0 0 12px #8B5CF6)'}}>⌨️</div></div>,
  },
  {
    key: 'wordle', label: 'WORDLE', genre: 'WORD',
    format: (v) => `${v || 0} wins`, color: '#06D6A0', diff: 2, isNew: true,
    art: () => <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}><div style={{fontSize:40,filter:'drop-shadow(0 0 12px #06D6A0)'}}>📝</div></div>,
  },
  {
    key: 'flappy-bird', label: 'FLAPPY BIRD', genre: 'ARCADE',
    format: (v) => v || 0, color: '#FFB703', diff: 3, isNew: true,
    art: () => <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}><div style={{fontSize:40,filter:'drop-shadow(0 0 12px #FFB703)'}}>🐦</div></div>,
  },
  {
    key: 'tic-tac-toe', label: 'TIC TAC TOE', genre: 'STRATEGY',
    format: (v) => `${v || 0} wins`, color: '#FF006E', diff: 1,
    art: () => <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}><div style={{fontSize:40,filter:'drop-shadow(0 0 12px #FF006E)'}}>❌</div></div>,
  },
  {
    key: 'cryptogram', label: 'CRYPTOGRAM', genre: 'PUZZLE',
    format: (v) => `${v || 0} solved`, color: '#00F5FF', diff: 3, isNew: true,
    art: () => <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}><div style={{fontSize:40,filter:'drop-shadow(0 0 12px #00F5FF)'}}>🔐</div></div>,
  },
];

const GAME_COMPONENTS = {
  '2048': Game2048, 'tic-tac-toe': TicTacToe, 'reaction-test': ReactionTest,
  'snake': Snake, 'simon-says': SimonSays, 'whack-a-mole': WhackAMole,
  'type-racer': TypeRacer, 'wordle': Wordle, 'flappy-bird': FlappyBird, 'cryptogram': Cryptogram,
};

// ─── Leaderboard ─────────────────────────────────────────────────
function Leaderboard({ currentGame }) {
  const [game, setGame] = useState(currentGame || '2048');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (g) => {
    setLoading(true);
    try {
      const { data: d } = await api.get(`/games/leaderboard?gameId=${g}`);
      setData(d);
    } catch { setData(null); }
    setLoading(false);
  }, []);

  useEffect(() => { load(game); }, [game, load]);

  const medals = ['🥇','🥈','🥉'];
  const medalColors = ['#FFD700','#C0C0C0','#CD7F32'];

  return (
    <div className="flex flex-col gap-4 px-4 py-3">
      {/* Game selector */}
      <div className="flex gap-1 overflow-x-auto pb-1" style={{scrollbarWidth:'none'}}>
        {GAMES.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => setGame(g.key)}
            style={{
              flexShrink:0, fontFamily:'monospace', fontSize:10, letterSpacing:1,
              color: game===g.key ? '#0A0A0F' : '#6B6B8A',
              background: game===g.key ? g.color : '#12121A',
              border: `1px solid ${game===g.key ? g.color : '#252535'}`,
              borderRadius:6, padding:'6px 10px',
              boxShadow: game===g.key ? `0 0 10px ${g.color}55` : 'none',
              transition:'all 0.2s',
            }}
          >{g.label}</button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div style={{fontFamily:'monospace',fontSize:11,color:'#6B6B8A',letterSpacing:2,animation:'pulse 1s ease infinite'}}>LOADING...</div>
        </div>
      )}

      {data && !loading && (
        <div className="flex flex-col gap-1">
          {data.leaderboard.length === 0 && (
            <div style={{fontFamily:'monospace',fontSize:12,color:'#6B6B8A',textAlign:'center',padding:32}}>No scores yet. Be the first!</div>
          )}
          {data.leaderboard.map((entry, i) => {
            const gameColor = GAMES.find(g=>g.key===game)?.color||'#00F5FF';
            const isTop3 = i < 3;
            const initials = (entry.displayName||entry.username||'?').slice(0,2).toUpperCase();
            const formatScore = game==='reaction-test' ? `${entry.score}ms` : entry.score;
            return (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-3 rounded-xl"
                style={{
                  background: isTop3 ? `rgba(${i===0?'255,215,0':i===1?'192,192,192':'205,127,50'},0.06)` : '#12121A',
                  border: `1px solid ${isTop3 ? `rgba(${i===0?'255,215,0':i===1?'192,192,192':'205,127,50'},0.3)` : '#252535'}`,
                  boxShadow: i===0 ? `0 0 12px rgba(255,215,0,0.15)` : 'none',
                  animation: i===0 ? 'goldPulse 2s ease infinite' : 'none',
                }}
              >
                <div style={{minWidth:32,textAlign:'center',fontSize:isTop3?20:12,color:isTop3?medalColors[i]:'#6B6B8A',fontFamily:'monospace',fontWeight:700}}>
                  {isTop3 ? medals[i] : `#${i+1}`}
                </div>
                <div style={{width:32,height:32,borderRadius:'50%',background:entry.avatarColor||gameColor,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'monospace',fontSize:11,fontWeight:700,color:'#0A0A0F',flexShrink:0}}>
                  {initials}
                </div>
                <div style={{flex:1,overflow:'hidden'}}>
                  <div style={{fontFamily:'monospace',fontSize:12,color:'#E8E8FF',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{entry.displayName||entry.username}</div>
                  <div style={{fontFamily:'monospace',fontSize:9,color:'#6B6B8A',marginTop:1}}>{entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : ''}</div>
                </div>
                <div style={{fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:18,color:gameColor,textShadow:`0 0 8px ${gameColor}55`,flexShrink:0}}>{formatScore}</div>
              </div>
            );
          })}
          {data.myRank && !data.leaderboard.find((_,i)=>i<10) && (
            <div className="flex items-center justify-center gap-2 py-2 rounded-lg mt-1" style={{background:'rgba(0,245,255,0.06)',border:'1px solid rgba(0,245,255,0.2)'}}>
              <span style={{fontFamily:'monospace',fontSize:11,color:'#00F5FF',letterSpacing:2}}>YOUR RANK: #{data.myRank}</span>
            </div>
          )}
          {data.myRank && (
            <div className="text-center mt-1">
              <span style={{fontFamily:'monospace',fontSize:10,color:'#6B6B8A'}}>YOUR RANK: <span style={{color:'#00F5FF'}}>#{data.myRank}</span></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Game Card ────────────────────────────────────────────────────
function GameCard({ game, stat, onClick }) {
  const Art = game.art;
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative text-left rounded-xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, rgba(${game.color==='#00F5FF'?'0,245,255':game.color==='#06D6A0'?'6,214,160':game.color==='#FFB703'?'255,183,3':game.color==='#FF006E'?'255,0,110':game.color==='#F97316'?'249,115,22':'139,92,246'},0.07) 0%, #12121A 100%)`,
        border: `1px solid ${game.color}33`,
        height: 165,
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.15s, box-shadow 0.15s',
        boxShadow: `0 2px 12px rgba(0,0,0,0.4)`,
      }}
      onMouseEnter={(e)=>{e.currentTarget.style.boxShadow=`0 0 20px ${game.color}33`;e.currentTarget.style.transform='translateY(-2px)';}}
      onMouseLeave={(e)=>{e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.4)';e.currentTarget.style.transform='none';}}
      onMouseDown={(e)=>e.currentTarget.style.transform='scale(0.97)'}
      onMouseUp={(e)=>e.currentTarget.style.transform='none'}
      onTouchStart={(e)=>e.currentTarget.style.transform='scale(0.97)'}
      onTouchEnd={(e)=>e.currentTarget.style.transform='none'}
    >
      {game.isNew && (
        <span className="absolute top-2 right-2 z-10" style={{fontFamily:'monospace',fontSize:8,padding:'2px 6px',borderRadius:4,background:'rgba(255,0,110,0.2)',color:'#FF006E',border:'1px solid rgba(255,0,110,0.4)',letterSpacing:1}}>NEW</span>
      )}
      {/* Art area */}
      <div style={{flex:1,position:'relative',overflow:'hidden'}}>
        <Art />
      </div>
      {/* Info */}
      <div style={{padding:'6px 10px 8px',borderTop:`1px solid ${game.color}22`,background:'rgba(0,0,0,0.3)'}}>
        <div className="flex items-center justify-between mb-1">
          <span style={{fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:14,color:game.color,letterSpacing:1}}>{game.label}</span>
          <div className="flex gap-0.5">
            {[1,2,3].map(d=>(
              <div key={d} style={{width:5,height:5,borderRadius:'50%',background:d<=game.diff?game.color:'#252535',boxShadow:d<=game.diff?`0 0 4px ${game.color}`:'none'}}/>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span style={{fontFamily:'monospace',fontSize:9,color:'#6B6B8A',letterSpacing:1}}>{game.genre}</span>
          <span style={{fontFamily:'monospace',fontSize:9,color:'#FFB703'}}>⭐ {stat}</span>
        </div>
      </div>
      {/* Play button */}
      <div style={{padding:'0 8px 8px'}}>
        <div style={{width:'100%',padding:'6px 0',borderRadius:6,background:`${game.color}18`,border:`1px solid ${game.color}`,fontFamily:'monospace',fontSize:10,letterSpacing:2,color:game.color,textAlign:'center',boxShadow:`0 0 8px ${game.color}22`}}>
          PLAY →
        </div>
      </div>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export const getServerSideProps = async () => ({ props: {} });

export default function GamesPage() {
  const router = useRouter();
  const [activeGame, setActiveGame] = useState(null);
  const [showGameScoreboard, setShowGameScoreboard] = useState(false);
  const [tab, setTab] = useState('games'); // games | leaderboard
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get('/games/stats');
      setStats(data.stats || {});
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    if (router.query.game && GAME_COMPONENTS[router.query.game]) {
      setActiveGame(router.query.game);
    }
  }, [router.query.game]);

  const goBack = useCallback(() => {
    hapticTap(6); setActiveGame(null); setShowGameScoreboard(false); loadStats();
  }, [loadStats]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && activeGame) goBack(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeGame, goBack]);

  const isHost = router.query.host !== '0';
  const ActiveComponent = activeGame ? GAME_COMPONENTS[activeGame] : null;

  return (
    <div className="flex flex-col h-full pb-16 overflow-hidden">
      <style>{`
        @keyframes tileFloat{0%{transform:translateY(0)}100%{transform:translateY(-4px)}}
        @keyframes boltPulse{0%,100%{transform:scale(1);filter:drop-shadow(0 0 12px #06D6A0)}50%{transform:scale(1.15);filter:drop-shadow(0 0 20px #06D6A0)}}
        @keyframes reelSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes carDrive{0%{transform:translateX(40px)}100%{transform:translateX(-40px)}}
        @keyframes speedLine{0%{opacity:0.8;transform:scaleX(1)}100%{opacity:0;transform:scaleX(0)}}
        @keyframes rocketFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes starTwinkle{0%{opacity:0.2}100%{opacity:1}}
        @keyframes goldPulse{0%,100%{box-shadow:0 0 12px rgba(255,215,0,0.15)}50%{box-shadow:0 0 20px rgba(255,215,0,0.3)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
      `}</style>

      {/* Header */}
      <div className="px-4 pt-10 pb-3 flex-shrink-0" style={{borderBottom:'1px solid #252535'}}>
        {activeGame ? (
          <button type="button" onClick={goBack} style={{width:36,height:36,border:'1px solid #252535',color:'#00F5FF',borderRadius:6,marginBottom:8,background:'#12121A',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}} aria-label="Back">←</button>
        ) : null}
        <div style={{fontFamily:'monospace',fontSize:10,letterSpacing:3,color:'#6B6B8A',marginBottom:2}}>ARCADE // MAX GAMES</div>
        <h1 style={{fontFamily:'Rajdhani,sans-serif',fontSize:32,fontWeight:900,color:'#00F5FF',textShadow:'0 0 20px rgba(0,245,255,0.35)',letterSpacing:3,lineHeight:1}}>
          {activeGame ? GAMES.find((g) => g.key === activeGame)?.label : '⚡ ARCADE'}
        </h1>
        {!activeGame && <p style={{fontFamily:'monospace',fontSize:10,color:'#6B6B8A',letterSpacing:3,marginTop:4}}>// SELECT YOUR MISSION</p>}
      </div>

      {/* Tabs (only on landing) */}
      {!activeGame && (
        <div className="flex flex-shrink-0 px-4 pt-3 gap-2">
          {[{id:'games',label:'MY GAMES'},{id:'leaderboard',label:'🏆 LEADERBOARD'}].map(({id,label})=>(
            <button
              key={id} type="button" onClick={()=>setTab(id)}
              style={{
                flex:1, fontFamily:'monospace', fontSize:11, letterSpacing:1, padding:'8px 0', borderRadius:8,
                color: tab===id?'#00F5FF':'#6B6B8A',
                background: tab===id?'rgba(0,245,255,0.1)':'#12121A',
                border: `1px solid ${tab===id?'#00F5FF':'#252535'}`,
                boxShadow: tab===id?'0 0 10px rgba(0,245,255,0.2)':'none',
                transition:'all 0.2s',
              }}
            >{label}</button>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* Active game */}
        {activeGame ? (
          <div className="flex-1 overflow-y-auto pb-4 relative">
            <button
              type="button"
              onClick={() => setShowGameScoreboard(true)}
              style={{
                position: 'absolute', top: 8, right: 12, zIndex: 20,
                background: 'rgba(0,245,255,0.1)', border: '1px solid #00F5FF44',
                borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                fontFamily: 'monospace', fontSize: 11, color: '#00F5FF',
              }}
            >
              🏆
            </button>
            <ErrorBoundary fallbackMessage="Game module failed to load.">
              {ActiveComponent && (
                <ActiveComponent
                  onExit={goBack}
                  onScoreSaved={loadStats}
                  {...(activeGame === 'ttt' && router.query.opponent
                    ? { socketMode:true, challengeId:router.query.opponent, opponentName:router.query.name||'Friend', isHost }
                    : {})}
                />
              )}
            </ErrorBoundary>
            {showGameScoreboard && (
              <Scoreboard game={activeGame} onClose={() => setShowGameScoreboard(false)} />
            )}
          </div>
        ) : tab === 'leaderboard' ? (
          <div className="flex-1 overflow-y-auto">
            <Leaderboard currentGame="2048" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {[0,1,2,3,4,5].map((i) => (
                  <div key={i} style={{height:165,borderRadius:12,background:'#12121A',border:'1px solid #252535',animation:'pulse 1.5s ease infinite'}}/>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {GAMES.map((game) => (
                  <GameCard
                    key={game.key}
                    game={game}
                    stat={game.format(stats[game.key])}
                    onClick={() => { hapticTap(8); setActiveGame(game.key); }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
