import { useState } from 'react';
import api from '../../utils/api';
import useAuthStore from '../../context/authStore';
import Avatar from '../ui/Avatar';
import useToast from '../../hooks/useToast';

const buildConvId = (a, b) => [a, b].sort().join('_');

export default function ShareScoreButton({ message }) {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const openPicker = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const { data } = await api.get('/friends');
      setFriends(data.friends || []);
    } catch {
      setFriends([]);
    }
    setLoading(false);
  };

  const share = async (friendId) => {
    try {
      await api.post('/messages', {
        receiverId: friendId,
        content: message,
        type: 'text',
      });
      setOpen(false);
      toast.success('Score shared to comms channel!');
    } catch {
      toast.error('Failed to share score');
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={openPicker}
        className="hud-btn hud-btn-ghost w-full py-2.5 rounded-sm text-xs mt-3 active:scale-95"
        style={{ border: '1px solid #00F5FF44', color: '#00F5FF' }}
      >
        📡 SHARE RESULT IN CHAT
      </button>
    );
  }

  return (
    <div className="mt-3 p-3 rounded-sm" style={{ background: '#0A0A0F', border: '1px solid #252535' }}>
      <p className="font-mono text-[10px] mb-2" style={{ color: '#6B6B8A' }}>SEND TO SQUAD MEMBER</p>
      {loading ? (
        <div className="flex gap-1 justify-center py-4">
          <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
        </div>
      ) : (
        <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
          {friends.map((f) => (
            <button
              key={f._id}
              type="button"
              onClick={() => share(f._id)}
              className="flex items-center gap-2 p-2 rounded-sm w-full"
              style={{ background: '#12121A' }}
            >
              <Avatar user={f} size={28} />
              <span className="font-mono text-xs" style={{ color: '#E8E8FF' }}>{f.displayName || f.username}</span>
            </button>
          ))}
        </div>
      )}
      <button type="button" onClick={() => setOpen(false)} className="w-full mt-2 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>
        CANCEL
      </button>
    </div>
  );
}
