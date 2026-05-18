import { useEffect } from 'react';
import useNotificationStore from '../../context/notificationStore';
import hapticTap from '../../utils/haptic';

export default function NotificationCenter({ onClose, onNavigate }) {
  const { notifications, markAllAsRead, removeNotification, initNotifications } = useNotificationStore();

  useEffect(() => {
    initNotifications();
  }, [initNotifications]);

  const handleMarkAllRead = () => {
    hapticTap(10);
    markAllAsRead();
  };

  const handleItemClick = (notif) => {
    hapticTap(10);
    if (notif.url) {
      onNavigate?.(notif.url);
    }
    onClose();
  };

  const handleRemove = (e, id) => {
    e.stopPropagation();
    hapticTap(5);
    removeNotification(id);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'call': return '📹';
      case 'friend': return '👥';
      case 'battle': return '⚔️';
      default: return '💬';
    }
  };

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div
      className="fixed inset-x-0 top-0 z-40 bg-[#0A0A0F] border-b border-[#252535] flex flex-col shadow-[0_15px_40px_rgba(0,0,0,0.6)]"
      style={{
        maxHeight: '60vh',
        animation: 'slideDownPanel 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        paddingTop: 50 // Accommodate status bar / notches
      }}
    >
      <style>{`
        @keyframes slideDownPanel {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 bg-[#12121A] border-b border-[#252535]">
        <span className="font-heading font-bold text-white tracking-widest text-sm">NOTIFICATIONS</span>
        <div className="flex gap-4">
          {notifications.length > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="font-mono text-[9px] text-[#00F5FF] tracking-wider border border-[#00F5FF]/30 px-2 py-0.5 rounded bg-[#00F5FF]/5"
            >
              MARK ALL READ
            </button>
          )}
          <button onClick={onClose} className="text-[#6B6B8A] font-mono text-xs">CLOSE</button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto max-h-[40vh] p-2">
        {notifications.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 opacity-50">
            <span style={{ fontSize: 24 }}>🔕</span>
            <span className="font-mono text-[10px] tracking-widest text-[#6B6B8A]">NO NEW NOTIFICATIONS</span>
          </div>
        ) : (
          notifications.slice(0, 20).map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleItemClick(notif)}
              className="flex items-center gap-3 p-3 mb-1.5 rounded-xl bg-[#12121A] border border-[#252535] hover:bg-[#1A1A26] transition-colors relative cursor-pointer"
              style={{ opacity: notif.read ? 0.6 : 1 }}
            >
              {!notif.read && (
                <div className="absolute top-1/2 -translate-y-1/2 left-1.5 w-1.5 h-1.5 rounded-full bg-[#00F5FF] shadow-[0_0_6px_#00F5FF]" />
              )}
              <div className="w-8 h-8 rounded-full flex flex-shrink-0 items-center justify-center bg-[#1A1A26] border border-[#252535]">
                <span className="text-sm">{getIcon(notif.type)}</span>
              </div>
              <div className="flex-1 min-w-0 pl-1">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-heading font-semibold text-xs text-[#E8E8FF] truncate">
                    {notif.title || notif.senderName || 'System'}
                  </span>
                  <span className="font-mono text-[8px] text-[#6B6B8A]">{formatTime(notif.createdAt)}</span>
                </div>
                <p className="font-mono text-[10px] text-[#6B6B8A] truncate">
                  {notif.body || notif.content}
                </p>
              </div>
              <button
                onClick={(e) => handleRemove(e, notif.id)}
                className="text-[#6B6B8A] p-1 font-mono text-[10px] ml-1"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
