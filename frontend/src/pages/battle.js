import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import BottomNav from '../components/ui/BottomNav';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import BattleCard from '../components/battle/BattleCard';
import ChallengePicker from '../components/battle/ChallengePicker';
import useAuthStore from '../context/authStore';
import useSocket from '../hooks/useSocket';
import api from '../utils/api';

export default function BattlePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [active, setActive] = useState([]);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ wins: 0, losses: 0, streak: 0 });
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [acceptBattle, setAcceptBattle] = useState(null);
  const [tab, setTab] = useState('active');
  const [preselectFriend, setPreselectFriend] = useState(null);

  const load = useCallback(async () => {
    try {
      const [activeRes, histRes, statsRes, frRes] = await Promise.all([
        api.get('/battles/active'),
        api.get('/battles/history'),
        api.get('/battles/stats'),
        api.get('/friends'),
      ]);
      setActive(activeRes.data.battles || []);
      setHistory(histRes.data.battles || []);
      setStats(statsRes.data.stats || { wins: 0, losses: 0, streak: 0 });
      setFriends(frRes.data.friends || []);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!router.query.challenge || !friends.length) return;
    const f = friends.find((x) => x._id === router.query.challenge);
    if (f) {
      setPreselectFriend(f);
      setAcceptBattle(null);
      setShowPicker(true);
    }
  }, [router.query.challenge, friends]);

  const upsertBattle = (battle) => {
    setActive((prev) => {
      const idx = prev.findIndex((b) => b._id === battle._id);
      if (battle.status === 'completed' || battle.status === 'expired') {
        if (idx >= 0) {
          const next = [...prev];
          next.splice(idx, 1);
          return next;
        }
        return prev;
      }
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = battle;
        return next;
      }
      return [battle, ...prev];
    });
    if (battle.status === 'completed') {
      setHistory((h) => [battle, ...h.filter((b) => b._id !== battle._id)]);
      load();
    }
  };

  useSocket({
    onBattleChallenge: ({ battle }) => {
      upsertBattle(battle);
      setAcceptBattle(battle);
      setShowPicker(true);
    },
    onBattleAccepted: ({ battle }) => upsertBattle(battle),
    onBattleVoteUpdate: ({ battle }) => upsertBattle(battle),
    onBattleCompleted: ({ battle }) => upsertBattle(battle),
  });

  const pendingForMe = active.filter(
    (b) => b.status === 'pending' && (b.opponent._id || b.opponent) === user._id
  );

  return (
    <div className="flex flex-col h-full pb-16">
      <div className="px-4 pt-10 pb-3" style={{ borderBottom: '1px solid #252535' }}>
        <div className="font-mono text-[10px] tracking-widest mb-0.5" style={{ color: '#6B6B8A' }}>SYS://COMBAT</div>
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-bold tracking-wider" style={{ color: '#FF006E', textShadow: '0 0 15px rgba(255,0,110,0.3)' }}>
            MEME BATTLE
          </h1>
          <button
            type="button"
            onClick={() => { setAcceptBattle(null); setShowPicker(true); }}
            className="hud-btn px-3 py-2 rounded-sm text-[10px] font-mono tracking-widest"
            style={{ background: 'rgba(255,0,110,0.15)', border: '1px solid #FF006E', color: '#FF006E' }}
          >
            ⚔️ CHALLENGE
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 px-4 py-3" style={{ borderBottom: '1px solid #252535' }}>
        {[
          { label: 'WINS', val: stats.wins, color: '#06D6A0' },
          { label: 'LOSSES', val: stats.losses, color: '#FF006E' },
          { label: 'STREAK', val: stats.streak, color: '#FFB703' },
        ].map(({ label, val, color }) => (
          <div key={label} className="text-center py-2 rounded-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
            <div className="font-heading text-xl font-bold" style={{ color }}>{val}</div>
            <div className="font-mono text-[9px] tracking-widest" style={{ color: '#6B6B8A' }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="flex px-4 pt-2 gap-4" style={{ borderBottom: '1px solid #252535' }}>
        {['active', 'history'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="pb-2 font-mono text-xs tracking-widest"
            style={{
              color: tab === t ? '#00F5FF' : '#6B6B8A',
              borderBottom: tab === t ? '2px solid #00F5FF' : '2px solid transparent',
            }}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <ErrorBoundary fallbackMessage="Battle module failed to load.">
          {loading ? (
            <div className="grid grid-cols-1 gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="meme-skeleton h-48 rounded-sm" />
              ))}
            </div>
          ) : tab === 'active' ? (
            active.length === 0 ? (
              <div className="text-center py-16 px-4">
                <p className="font-heading text-xl font-bold empty-hud-text mb-2" style={{ color: '#FF006E' }}>
                  NO ACTIVE BATTLES
                </p>
                <p className="font-mono text-xs" style={{ color: '#6B6B8A' }}>
                  CHALLENGE A FRIEND TO START COMBAT
                </p>
              </div>
            ) : (
              active.map((b) => <BattleCard key={b._id} battle={b} onUpdate={upsertBattle} />)
            )
          ) : history.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-heading text-lg empty-hud-text" style={{ color: '#6B6B8A' }}>
                NO BATTLE HISTORY
              </p>
            </div>
          ) : (
            history.map((b) => <BattleCard key={b._id} battle={b} onUpdate={load} />)
          )}
        </ErrorBoundary>
      </div>

      {showPicker && (
        <ChallengePicker
          friends={friends}
          acceptBattle={acceptBattle}
          preselectFriend={preselectFriend}
          onClose={() => { setShowPicker(false); setAcceptBattle(null); setPreselectFriend(null); }}
          onSent={upsertBattle}
          onAccepted={upsertBattle}
        />
      )}

      <BottomNav />
    </div>
  );
}
