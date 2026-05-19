import { useState, memo, useRef, useCallback } from 'react';
import Avatar from '../ui/Avatar';
import MemeImage from '../ui/MemeImage';
import { saveGalleryPhoto } from '../../utils/galleryStorage';

const EMOJIS = ['❤️', '😂', '🔥', '👀', '💀', '🤯'];

const formatTime = (date) => {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

function MessageBubble({ message, isOwn, onReact, onReply, onDelete }) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const pressTimerRef = useRef(null);

  const isDeleted = message.deletedForEveryone;
  const isRead = message.readBy?.some((id) => id !== message.sender?._id && id !== message.sender);
  const isBase64Meme = message.type === 'meme' && message.content?.startsWith?.('data:image');
  const isGif = message.type === 'gif';
  const [gifLoaded, setGifLoaded] = useState(false);
  const reactionCounts = {};
  message.reactions?.forEach((r) => {
    reactionCounts[r.emoji] = r.users.length;
  });

  const handleLongPress = useCallback(() => {
    if (!isDeleted) {
      setShowActions(true);
      setShowEmojiPicker(false);
      if (isBase64Meme) setShowDownload(true);
    }
  }, [isDeleted, isBase64Meme]);

  const onTouchStart = useCallback(() => {
    pressTimerRef.current = setTimeout(handleLongPress, 400);
  }, [handleLongPress]);

  const onTouchEnd = useCallback(() => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
  }, []);

  const handleDownload = () => {
    if (!isBase64Meme) return;
    const link = document.createElement('a');
    link.href = message.content;
    link.download = `max-meme-${Date.now()}.png`;
    link.click();
    setShowDownload(false);
    setShowActions(false);
  };

  const handleSaveGallery = () => {
    if (!isBase64Meme) return;
    saveGalleryPhoto(message.content, message.memeData?.name || '');
    setShowDownload(false);
    setShowActions(false);
  };

  return (
    <div
      className={`message-bubble-row flex items-end gap-2 mb-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} animate-fade-in relative`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onContextMenu={(e) => {
        e.preventDefault();
        handleLongPress();
      }}
      style={{ willChange: 'transform', transform: 'translateZ(0)' }}
    >
      {!isOwn && <Avatar user={message.sender} size={28} />}

      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%] min-w-0`}>
        {message.replyTo && !message.replyTo.deletedForEveryone && (
          <div
            className="text-xs px-2 py-1 mb-1 rounded-sm border-l-2 max-w-full"
            style={{ borderColor: '#00F5FF', background: 'rgba(0,245,255,0.05)', color: '#6B6B8A' }}
          >
            <span className="block truncate">{message.replyTo.content?.startsWith?.('data:image') ? '🎭 Meme' : message.replyTo.content}</span>
          </div>
        )}

        <div
          className={`relative px-3 py-2 rounded-sm cursor-pointer select-none max-w-full ${isOwn ? 'bubble-own' : 'bubble-other'}`}
          onClick={() => {
            if (!isDeleted) setShowActions(!showActions);
            setShowEmojiPicker(false);
          }}
          style={{ wordBreak: 'break-word' }}
        >
          {isDeleted ? (
            <span className="italic" style={{ color: '#6B6B8A', fontSize: 13 }}>
              ⊘ This message was deleted
            </span>
          ) : isGif ? (
            <div>
              <button
                type="button"
                className="p-0 border-0 bg-transparent relative block"
                onClick={() => setLightbox(true)}
                style={{ maxWidth: 220 }}
              >
                {!gifLoaded && (
                  <div
                    className="rounded-sm"
                    style={{
                      width: 220, height: 160,
                      background: 'linear-gradient(90deg, #12121A 25%, #1A1A26 50%, #12121A 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.2s infinite',
                    }}
                  />
                )}
                <img
                  src={message.memeData?.url || message.content}
                  alt={message.memeData?.title || message.memeData?.name || 'GIF'}
                  className="rounded-sm"
                  style={{ maxWidth: 220, width: '100%', height: 'auto', display: gifLoaded ? 'block' : 'none' }}
                  onLoad={() => setGifLoaded(true)}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </button>
              {(message.memeData?.title || message.memeData?.name) && (
                <span className="block mt-1 font-mono text-[10px] truncate" style={{ color: '#6B6B8A' }}>
                  {message.memeData.title || message.memeData.name}
                </span>
              )}
            </div>
          ) : isBase64Meme ? (
            <button type="button" className="p-0 border-0 bg-transparent" onClick={() => setLightbox(true)}>
              <img
                src={message.content}
                alt={message.memeData?.name || 'Meme'}
                className="rounded-sm"
                style={{ maxWidth: 250, width: '100%', height: 'auto' }}
                loading="lazy"
                decoding="async"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </button>
          ) : message.type === 'meme' ? (
            <div>
              <div className="relative rounded-sm overflow-hidden" style={{ maxHeight: 200, width: '100%', minHeight: 80 }}>
                <MemeImage
                  src={message.memeData?.url}
                  alt={message.memeData?.name || 'Meme'}
                  fill
                  className="w-full"
                  sizes="(max-width: 768px) 75vw, 300px"
                />
              </div>
              {message.memeData?.name && (
                <span className="block mt-1 font-mono text-[10px] truncate" style={{ color: '#6B6B8A' }}>
                  {message.memeData.name}
                </span>
              )}
            </div>
          ) : (
            <span style={{ fontSize: 14, lineHeight: 1.5, color: '#E8E8FF' }}>{message.content}</span>
          )}

          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <span className="font-mono text-[10px]" style={{ color: '#6B6B8A' }}>
              {formatTime(message.createdAt)}
            </span>
            {isOwn && !isDeleted && (
              <span className={isRead ? 'tick-double' : 'tick-single'} style={{ fontSize: 11 }}>
                {isRead ? '✓✓' : '✓'}
              </span>
            )}
          </div>
        </div>

        {Object.keys(reactionCounts).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact?.(message._id, emoji)}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs active:scale-95"
                style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.2)' }}
              >
                <span>{emoji}</span>
                <span className="font-mono" style={{ color: '#00F5FF', fontSize: 10 }}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        )}

        {showActions && !isDeleted && (
          <div
            className={`flex items-center gap-1 mt-1 p-1 rounded-sm ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
            style={{ background: '#1A1A26', border: '1px solid #252535' }}
          >
            {showDownload && (
              <>
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded-sm font-mono active:scale-95"
                  style={{ color: '#06D6A0', fontSize: 11 }}
                  onClick={handleSaveGallery}
                >
                  📸 GALLERY
                </button>
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded-sm font-mono active:scale-95"
                  style={{ color: '#FFB703', fontSize: 11 }}
                  onClick={handleDownload}
                >
                  ⬇ SAVE
                </button>
              </>
            )}
            <button
              type="button"
              className="text-xs px-2 py-1 rounded-sm font-mono active:scale-95"
              style={{ color: '#00F5FF', fontSize: 11 }}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              😊
            </button>
            <button
              type="button"
              className="text-xs px-2 py-1 rounded-sm font-mono active:scale-95"
              style={{ color: '#E8E8FF', fontSize: 11 }}
              onClick={() => {
                onReply?.(message);
                setShowActions(false);
              }}
            >
              ↩ REPLY
            </button>
            <button
              type="button"
              className="text-xs px-2 py-1 rounded-sm font-mono active:scale-95"
              style={{ color: '#FF006E', fontSize: 11 }}
              onClick={() => {
                onDelete?.(message._id, isOwn);
                setShowActions(false);
              }}
            >
              🗑
            </button>
            <button
              type="button"
              className="text-xs px-2 py-1 rounded-sm font-mono active:scale-95"
              style={{ color: '#6B6B8A', fontSize: 11 }}
              onClick={() => setShowActions(false)}
            >
              ✕
            </button>
          </div>
        )}

        {showEmojiPicker && (
          <div
            className="flex gap-1 mt-1 p-2 rounded-sm"
            style={{ background: '#1A1A26', border: '1px solid #252535' }}
          >
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="text-xl hover:scale-125 transition-transform active:scale-95"
                onClick={() => {
                  onReact?.(message._id, emoji);
                  setShowEmojiPicker(false);
                  setShowActions(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox && (isBase64Meme || isGif) && (
        <button
          type="button"
          className="fixed inset-0 z-[200] flex items-center justify-center p-2 border-0"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setLightbox(false)}
        >
          <img
            src={isGif ? (message.memeData?.url || message.content) : message.content}
            alt=""
            className="max-w-full max-h-full object-contain"
          />
        </button>
      )}
    </div>
  );
}

export default memo(MessageBubble);
