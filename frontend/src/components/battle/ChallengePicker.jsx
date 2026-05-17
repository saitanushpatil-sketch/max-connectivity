import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import Avatar from '../ui/Avatar';
import MemeImage from '../ui/MemeImage';
import SkeletonGrid from '../ui/SkeletonGrid';
import useToast from '../../hooks/useToast';

export default function ChallengePicker({ friends, onClose, onSent, acceptBattle, onAccepted, preselectFriend }) {
  const [step, setStep] = useState(acceptBattle || preselectFriend ? 'meme' : 'friend');
  const [selectedFriend, setSelectedFriend] = useState(
    acceptBattle ? acceptBattle.challenger : preselectFriend || null
  );
  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const fetchMemes = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/memes/trending');
      setMemes(data.memes || []);
    } catch {
      setMemes([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (step === 'meme') fetchMemes();
  }, [step, fetchMemes]);

  const handleSend = async (meme) => {
    setSending(true);
    try {
      if (acceptBattle) {
        const { data } = await api.put(`/battles/${acceptBattle._id}/accept`, {
          meme: { memeId: meme._id, url: meme.url, name: meme.name },
        });
        onAccepted?.(data.battle);
      } else {
        const { data } = await api.post('/battles/challenge', {
          opponentId: selectedFriend._id,
          meme: { memeId: meme._id, url: meme.url, name: meme.name },
        });
        onSent?.(data.battle);
      }
      toast.success(acceptBattle ? 'Battle accepted!' : 'Battle challenge sent!');
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
    setSending(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center challenge-picker-backdrop"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-app rounded-t-sm p-4 max-h-[80vh] overflow-y-auto challenge-picker-slide"
        style={{ background: '#12121A', border: '1px solid #252535' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-mono text-[10px] tracking-widest" style={{ color: '#6B6B8A' }}>
              {acceptBattle ? '// ACCEPT CHALLENGE' : '// NEW CHALLENGE'}
            </div>
            <h2 className="font-heading text-lg font-bold" style={{ color: '#00F5FF' }}>
              {step === 'friend' ? 'SELECT TARGET' : 'SELECT MEME'}
            </h2>
          </div>
          <button type="button" onClick={onClose} style={{ color: '#6B6B8A' }}>✕</button>
        </div>

        {step === 'friend' && (
          <div className="flex flex-col gap-2">
            {friends.map((f) => (
              <button
                key={f._id}
                type="button"
                onClick={() => { setSelectedFriend(f); setStep('meme'); }}
                className="flex items-center gap-3 p-3 rounded-sm w-full text-left holo-hover"
                style={{ background: '#0A0A0F', border: '1px solid #252535' }}
              >
                <Avatar user={f} size={40} />
                <span className="font-heading font-semibold" style={{ color: '#E8E8FF' }}>
                  {f.displayName || f.username}
                </span>
              </button>
            ))}
          </div>
        )}

        {step === 'meme' && (
          <>
            {selectedFriend && !acceptBattle && (
              <p className="font-mono text-xs mb-3" style={{ color: '#6B6B8A' }}>
                VS {selectedFriend.displayName || selectedFriend.username}
              </p>
            )}
            {loading ? (
              <SkeletonGrid count={9} cols={3} />
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {memes.map((meme) => (
                  <button
                    key={meme._id}
                    type="button"
                    disabled={sending}
                    onClick={() => handleSend(meme)}
                    className="relative aspect-square rounded-sm overflow-hidden active:scale-95"
                    style={{ border: '1px solid #252535' }}
                  >
                    <MemeImage src={meme.url} alt={meme.name} fill className="w-full h-full" />
                  </button>
                ))}
              </div>
            )}
            {!acceptBattle && (
              <button
                type="button"
                onClick={() => setStep('friend')}
                className="w-full mt-3 py-2 font-mono text-xs"
                style={{ color: '#6B6B8A' }}
              >
                ← BACK
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
