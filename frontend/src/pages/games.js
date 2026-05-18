import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import BottomNav from '../components/ui/BottomNav';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import Game2048 from '../components/games/Game2048';
import TicTacToe from '../components/games/TicTacToe';
import DesiQuiz from '../components/games/DesiQuiz';
import ReactionTest from '../components/games/ReactionTest';
import CarRacer from '../components/games/CarRacer';
import SpaceShooter from '../components/games/SpaceShooter';
import Scoreboard from '../components/games/Scoreboard';
import api from '../utils/api';
import hapticTap from '../utils/haptic';

const GAMES = [
  {
    key: '2048', label: '2048', genre: 'PUZZLE', statKey: 'game2048HighScore',
    format: (v) => v || 0, color: '#00F5FF', diff: 2,
    art: () => (
      <div style={{display:'flex',flexWrap:'wrap',gap:3,padding:6,justifyContent:'center',alignItems:'center',height:'100%'}}>
        {[2,4,8,16,32,64,128,256].map((n,i)=>(
          <div key={n} style={{width:24,height:24,borderRadius:4,background:`rgba(0,245,255,${0.05+i*0.08})`,border:'1px solid rgba(0,245,255,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:8,color:'#00F5FF',animation:`tileFloat ${1.5+i*0.15}s ease-in-out ${i*0.1}s infinite alternate`}}>{n}</div>
        ))}
      </div>
    ),
  },
  {
    key: 'reaction', label: 'SPEED TAP', genre: 'REFLEX', statKey: 'reactionBestAvg',
    format: (v) => (v ? `${v}ms` : '—'), color: '#06D6A0', diff: 1,
    art: () => (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}>
        <div style={{fontSize:40,animation:'boltPulse 1s ease-in-out infinite',filter:'drop-shadow(0 0 12px #06D6A0)'}}>⚡</div>
      </div>
    ),
  },
  {
    key: 'desi', label: 'DESI QUIZ', genre: 'TRIVIA', statKey: 'desiQuizHighScore',
    format: (v) => `${v || 0}/10`, color: '#FFB703', diff: 2,
    art: () => (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}>
        <div style={{fontSize:36,animation:'reelSpin 3s linear infinite',filter:'drop-shadow(0 0 10px #FFB703)'}}>🎬</div>
        <div style={{position:'absolute',fontFamily:'monospace',fontSize:8,color:'#FFB703',bottom:6,letterSpacing:2,opacity:0.7}}>FILMY QUIZ</div>
      </div>
    ),
  },
  {
    key: 'ttt', label: 'TIC TAC TOE', genre: 'STRATEGY', statKey: 'tttWins',
    format: (v) => `${v || 0} wins`, color: '#FF006E', diff: 2,
    art: () => (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',gap:2}}>
        <svg width="60" height="60" viewBox="0 0 60 60">
          <line x1="20" y1="5" x2="20" y2="55" stroke="#252535" strokeWidth="2"/>
          <line x1="40" y1="5" x2="40" y2="55" stroke="#252535" strokeWidth="2"/>
          <line x1="5" y1="20" x2="55" y2="20" stroke="#252535" strokeWidth="2"/>
          <line x1="5" y1="40" x2="55" y2="40" stroke="#252535" strokeWidth="2"/>
          <text x="10" y="18" fill="#00F5FF" fontSize="12" fontWeight="bold" style={{filter:'drop-shadow(0 0 4px #00F5FF)'}}>✕</text>
          <circle cx="50" cy="12" r="6" fill="none" stroke="#FF006E" strokeWidth="2" style={{filter:'drop-shadow(0 0 4px #FF006E)'}}/>
          <text x="10" y="38" fill="#FF006E" fontSize="12" fontWeight="bold">○</text>
          <text x="44" y="55" fill="#00F5FF" fontSize="12" fontWeight="bold" style={{filter:'drop-shadow(0 0 4px #00F5FF)'}}>✕</text>
        </svg>
      </div>
    ),
  },
  {
    key: 'car', label: 'CAR RACER', genre: 'ARCADE', statKey: 'carRacerHighScore',
    format: (v) => v || 0, color: '#F97316', diff: 2, isNew: true,
    art: () => (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',overflow:'hidden',position:'relative'}}>
        <div style={{fontSize:32,animation:'carDrive 1.5s linear infinite',filter:'drop-shadow(0 0 8px #F97316)'}}>🏎️</div>
        {[...Array(4)].map((_,i)=>(
          <div key={i} style={{position:'absolute',right:0,top:`${20+i*15}%`,width:`${20+Math.random()*30}%`,height:1,background:`rgba(249,115,22,${0.2+i*0.1})`,animation:`speedLine ${0.4+i*0.1}s linear ${i*0.1}s infinite`}}/>
        ))}
      </div>
    ),
  },
  {
    key: 'space', label: 'SPACE SHOOTER', genre: 'SHMUP', statKey: 'spaceShooterHighScore',
    format: (v) => v || 0, color: '#8B5CF6', diff: 3, isNew: true,
    art: () => (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',position:'relative'}}>
        <div style={{fontSize:32,animation:'rocketFloat 2s ease-in-out infinite',filter:'drop-shadow(0 0 10px #8B5CF6)'}}>🚀</div>
        {[...Array(6)].map((_,i)=>(
          <div key={i} style={{position:'absolute',width:2,height:2,borderRadius:'50%',background:'#fff',top:`${Math.random()*100}%`,left:`${Math.random()*100}%`,animation:`starTwinkle ${1+Math.random()}s ease-in-out ${Math.random()}s infinite alternate`,opacity:0.6}}/>
        ))}
        <div style={{position:'absolute',bottom:4,fontFamily:'monospace',fontSize:8,color:'rgba(139,92,246,0.7)',letterSpacing:1}}>🔥 ENGINE</div>
      </div>
    ),
  },
];

const GAME_COMPONENTS = {
  '2048': Game2048, ttt: TicTacToe, desi: DesiQuiz,
  reaction: ReactionTest, car: CarRacer, space: SpaceShooter,
};

// ─── Leaderboard ─────────────────────────────────────────────────
function Leaderboard({ currentGame }) {
  const [game, setGame] = useState(currentGame || '2048');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (g) => {
    setLoading(true);
    try {
      const { data: d } = await api.get(`/games/leaderboard?game=${g}`);
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
            const formatScore = game==='reaction' ? `${entry.score}ms` : entry.score;
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
                    stat={game.format(stats[game.statKey])}
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
