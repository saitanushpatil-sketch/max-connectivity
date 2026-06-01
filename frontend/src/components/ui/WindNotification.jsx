import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const WindNotification = ({ notification, onClose }) => {
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [notification, onClose]);

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          key={notification.id}
          initial={{ x: '120%', opacity: 0, rotate: 2 }}
          animate={{ x: 0, opacity: 1, rotate: 0 }}
          exit={{ x: '120%', opacity: 0, rotate: -2 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 28,
            mass: 0.8
          }}
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 9999,
            background: 'linear-gradient(135deg, rgba(10,10,15,0.95) 0%, rgba(18,18,26,0.95) 100%)',
            border: '1px solid rgba(0,245,255,0.3)',
            borderRadius: 16,
            padding: '12px 16px',
            minWidth: 280,
            maxWidth: 340,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 0 30px rgba(0,245,255,0.15), 0 8px 32px rgba(0,0,0,0.4)',
            cursor: 'pointer',
            overflow: 'hidden',
          }}
          onClick={onClose}
        >
          {/* Wind streak line 1 */}
          <motion.div
            initial={{ x: -200, opacity: 0.6 }}
            animate={{ x: 400, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              pointerEvents: 'none',
              background: 'linear-gradient(90deg, transparent 0%, rgba(0,245,255,0.08) 50%, transparent 100%)',
            }}
          />
          {/* Wind streak line 2 */}
          <motion.div
            initial={{ x: -200, opacity: 0.4 }}
            animate={{ x: 400, opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: 'easeOut' }}
            style={{
              position: 'absolute', top: '30%', left: 0, right: 0, height: 1,
              pointerEvents: 'none',
              background: 'linear-gradient(90deg, transparent 0%, rgba(0,245,255,0.2) 50%, transparent 100%)',
            }}
          />
          {/* Wind streak line 3 */}
          <motion.div
            initial={{ x: -200, opacity: 0.3 }}
            animate={{ x: 400, opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.14, ease: 'easeOut' }}
            style={{
              position: 'absolute', top: '65%', left: 0, right: 0, height: 1,
              pointerEvents: 'none',
              background: 'linear-gradient(90deg, transparent 0%, rgba(0,245,255,0.15) 50%, transparent 100%)',
            }}
          />

          {/* Scan line animation */}
          <motion.div
            animate={{ y: [-100, 100] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', left: 0, right: 0, height: 2,
              background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.1), transparent)',
              pointerEvents: 'none',
            }}
          />

          {/* Corner brackets — Iron Man HUD feel */}
          <div style={{ position: 'absolute', top: 6, left: 6, width: 10, height: 10,
            borderTop: '1.5px solid #00F5FF', borderLeft: '1.5px solid #00F5FF' }} />
          <div style={{ position: 'absolute', top: 6, right: 6, width: 10, height: 10,
            borderTop: '1.5px solid #00F5FF', borderRight: '1.5px solid #00F5FF' }} />
          <div style={{ position: 'absolute', bottom: 6, left: 6, width: 10, height: 10,
            borderBottom: '1.5px solid #00F5FF', borderLeft: '1.5px solid #00F5FF' }} />
          <div style={{ position: 'absolute', bottom: 6, right: 6, width: 10, height: 10,
            borderBottom: '1.5px solid #00F5FF', borderRight: '1.5px solid #00F5FF' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: `linear-gradient(135deg, ${notification.avatarColor || '#00F5FF'}22, ${notification.avatarColor || '#FF006E'}22)`,
                border: `2px solid ${notification.avatarColor || 'rgba(0,245,255,0.5)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0,
                boxShadow: `0 0 12px ${notification.avatarColor || 'rgba(0,245,255,0.3)'}`,
                fontFamily: 'Rajdhani, sans-serif',
                fontWeight: 700, fontSize: 16,
                color: notification.avatarColor || '#00F5FF',
              }}
            >
              {notification.avatar ? (
                <img src={notification.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span>{notification.icon || '💬'}</span>
              )}
            </motion.div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                style={{
                  fontSize: 13, fontWeight: 600, color: '#00F5FF',
                  fontFamily: 'Rajdhani, sans-serif',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}
              >
                {notification.title}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                  fontSize: 12, color: '#E8E8FFaa',
                  fontFamily: 'Exo 2, sans-serif',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  marginTop: 2,
                }}
              >
                {notification.body}
              </motion.div>
            </div>
          </div>

          {/* Progress bar — auto-dismiss countdown */}
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 4, ease: 'linear' }}
            style={{
              position: 'absolute', bottom: 0, left: 0, height: 2,
              background: 'linear-gradient(90deg, #00F5FF, #FF006E)',
              borderRadius: '0 0 16px 16px',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WindNotification;
