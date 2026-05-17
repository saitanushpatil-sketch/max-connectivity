import { useState } from 'react';
import Avatar from '../ui/Avatar';

const EMOJIS = ['❤️', '😂', '🔥', '👀', '💀', '🤯'];

const formatTime = (date) => {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function MessageBubble({ message, isOwn, onReact, onReply, onDelete, currentUserId }) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const isDeleted = message.deletedForEveryone;
  const isRead = message.readBy?.some((id) => id !== message.sender?._id && id !== message.sender);
  const reactionCounts = {};
  message.reactions?.forEach((r) => { reactionCounts[r.emoji] = r.users.length; });

  const handleLongPress = () => {
    if (!isDeleted) { setShowActions(true); setShowEmojiPicker(false); }
  };

  let pressTimer = null;
  const onTouchStart = () => { pressTimer = setTimeout(handleLongPress, 400); };
  const onTouchEnd = () => { if (pressTimer) clearTimeout(pressTimer); };

  return (
    <div
      className={`flex items-end gap-2 mb-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} animate-fade-in relative`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onContextMenu={(e) => { e.preventDefault(); handleLongPress(); }}
    >
      {!isOwn && (
        <Avatar user={message.sender} size={28} />
      )}

      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%]`}>
        {/* Reply preview */}
        {message.replyTo && !message.replyTo.deletedForEveryone && (
          <div
            className="text-xs px-2 py-1 mb-1 rounded-sm border-l-2"
            style={{ borderColor: '#00F5FF', background: 'rgba(0,245,255,0.05)', color: '#6B6B8A', maxWidth: '100%' }}
          >
            <span className="block truncate">{message.replyTo.content}</span>
          </div>
        )}

        {/* Bubble */}
        <div
          className={`relative px-3 py-2 rounded-sm cursor-pointer select-none ${isOwn ? 'bubble-own' : 'bubble-other'}`}
          onClick={() => { if (!isDeleted) setShowActions(!showActions); setShowEmojiPicker(false); }}
          style={{ wordBreak: 'break-word' }}
        >
          {isDeleted ? (
            <span className="italic" style={{ color: '#6B6B8A', fontSize: 13 }}>⊘ This message was deleted</span>
          ) : message.type === 'meme' ? (
            <div>
              <img
                src={message.memeData?.url}
                alt={message.memeData?.name || 'Meme'}
                className="rounded-sm max-w-full"
                style={{ maxHeight: 200, width: 'auto', display: 'block' }}
                loading="lazy"
              />
              {message.memeData?.name && (
                <span className="block mt-1 font-mono text-[10px]" style={{ color: '#6B6B8A' }}>{message.memeData.name}</span>
              )}
            </div>
          ) : (
            <span style={{ fontSize: 14, lineHeight: 1.5, color: '#E8E8FF' }}>{message.content}</span>
          )}

          {/* Time + read receipt */}
          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <span className="font-mono text-[10px]" style={{ color: '#6B6B8A' }}>{formatTime(message.createdAt)}</span>
            {isOwn && !isDeleted && (
              <span className={isRead ? 'tick-double' : 'tick-single'} style={{ fontSize: 11 }}>
                {isRead ? '✓✓' : '✓'}
              </span>
            )}
          </div>
        </div>

        {/* Reactions display */}
        {Object.keys(reactionCounts).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => onReact?.(message._id, emoji)}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs"
                style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.2)' }}
              >
                <span>{emoji}</span>
                <span className="font-mono" style={{ color: '#00F5FF', fontSize: 10 }}>{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Action menu */}
        {showActions && !isDeleted && (
          <div
            className={`flex items-center gap-1 mt-1 p-1 rounded-sm ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
            style={{ background: '#1A1A26', border: '1px solid #252535' }}
          >
            <button
              className="text-xs px-2 py-1 rounded-sm font-mono"
              style={{ color: '#00F5FF', fontSize: 11 }}
              onClick={() => { setShowEmojiPicker(!showEmojiPicker); }}
            >
              😊
            </button>
            <button
              className="text-xs px-2 py-1 rounded-sm font-mono"
              style={{ color: '#E8E8FF', fontSize: 11 }}
              onClick={() => { onReply?.(message); setShowActions(false); }}
            >
              ↩ REPLY
            </button>
            <button
              className="text-xs px-2 py-1 rounded-sm font-mono"
              style={{ color: '#FF006E', fontSize: 11 }}
              onClick={() => { onDelete?.(message._id, isOwn); setShowActions(false); }}
            >
              🗑
            </button>
            <button
              className="text-xs px-2 py-1 rounded-sm font-mono"
              style={{ color: '#6B6B8A', fontSize: 11 }}
              onClick={() => setShowActions(false)}
            >
              ✕
            </button>
          </div>
        )}

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div
            className="flex gap-1 mt-1 p-2 rounded-sm"
            style={{ background: '#1A1A26', border: '1px solid #252535' }}
          >
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                className="text-xl hover:scale-125 transition-transform"
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
    </div>
  );
}
