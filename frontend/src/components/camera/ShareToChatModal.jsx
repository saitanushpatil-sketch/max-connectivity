import { useState, useEffect } from 'react';
import api from '../../utils/api';
import Avatar from '../ui/Avatar';
import useToast from '../../hooks/useToast';
import { saveGalleryPhoto } from '../../utils/galleryStorage';

function compositeImageWithCaption(dataUrl, caption) {
  return new Promise((resolve) => {
    if (!caption?.trim()) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      ctx.font = `bold ${Math.max(18, Math.floor(img.width / 22))}px Rajdhani, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      const pad = 12;
      const text = caption.trim();
      const metrics = ctx.measureText(text);
      const tw = Math.min(metrics.width + pad * 2, img.width - 20);
      const th = parseInt(ctx.font, 10) + pad;
      const bx = (img.width - tw) / 2;
      const by = img.height - th - 20;
      ctx.fillRect(bx, by, tw, th);
      ctx.strokeStyle = '#00F5FF';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, tw, th);
      ctx.fillStyle = '#00F5FF';
      ctx.fillText(text, img.width / 2, by + th - pad / 2);
      resolve(c.toDataURL('image/jpeg', 0.92));
    };
    img.src = dataUrl;
  });
}

export default function ShareToChatModal({ photoDataUrl, caption, onClose }) {
  const { toast } = useToast();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/friends');
        setFriends(data.friends || []);
      } catch {
        setFriends([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const share = async (friendId) => {
    setSending(true);
    try {
      const finalUrl = await compositeImageWithCaption(photoDataUrl, caption);
      await api.post('/messages', {
        receiverId: friendId,
        content: finalUrl,
        type: 'meme',
        memeData: { name: caption?.trim() || 'Camera Photo', url: finalUrl },
      });
      toast.success('Photo sent to comms!');
      onClose();
    } catch {
      toast.error('Failed to send photo');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-app p-4 rounded-t-sm" style={{ background: '#12121A', border: '1px solid #252535' }}>
        <p className="font-mono text-[10px] tracking-widest mb-3" style={{ color: '#6B6B8A' }}>SHARE IN CHAT</p>
        {loading ? (
          <div className="flex justify-center py-6 gap-1">
            <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
          </div>
        ) : (
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {friends.map((f) => (
              <button
                key={f._id}
                type="button"
                disabled={sending}
                onClick={() => share(f._id)}
                className="flex items-center gap-3 p-3 rounded-sm w-full"
                style={{ background: '#0A0A0F', border: '1px solid #252535' }}
              >
                <Avatar user={f} size={36} />
                <span className="font-mono text-sm" style={{ color: '#E8E8FF' }}>{f.displayName || f.username}</span>
              </button>
            ))}
            {friends.length === 0 && (
              <p className="font-mono text-xs text-center py-4" style={{ color: '#6B6B8A' }}>No squad members yet</p>
            )}
          </div>
        )}
        <button type="button" onClick={onClose} className="w-full mt-3 py-2 font-mono text-xs" style={{ color: '#6B6B8A' }}>
          CANCEL
        </button>
      </div>
    </div>
  );
}
