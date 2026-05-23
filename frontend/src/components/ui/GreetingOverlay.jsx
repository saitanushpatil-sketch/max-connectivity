import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../context/authStore';
import hapticTap from '../../utils/haptic';

export default function GreetingOverlay() {
  const { user } = useAuthStore();
  const [show, setShow] = useState(false);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    // Only show once per session
    const hasSeen = sessionStorage.getItem('hasSeenGreeting');
    if (!hasSeen && user) {
      setShow(true);
      sessionStorage.setItem('hasSeenGreeting', 'true');

      // Determine greeting
      const hour = new Date().getHours();
      const name = user.username?.toUpperCase() || 'AGENT';
      
      if (hour >= 5 && hour < 12) {
        setGreeting(`GOOD MORNING, ${name}. SYSTEMS ONLINE.`);
      } else if (hour >= 12 && hour < 17) {
        setGreeting(`GOOD AFTERNOON, ${name}. ALL SYSTEMS OPERATIONAL.`);
      } else if (hour >= 17 && hour < 21) {
        setGreeting(`GOOD EVENING, ${name}. READY FOR DEPLOYMENT.`);
      } else {
        setGreeting(`GOOD NIGHT, ${name}. RUNNING IN STEALTH MODE.`);
      }

      // Auto dismiss
      const timer = setTimeout(() => {
        setShow(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [user]);

  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          onClick={() => {
            hapticTap(10);
            setShow(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(10, 10, 15, 0.95)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Scan line effect */}
          <motion.div
            initial={{ top: '-10%' }}
            animate={{ top: '110%' }}
            transition={{ duration: 1.5, ease: 'linear', repeat: Infinity }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: 4,
              background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.8), transparent)',
              boxShadow: '0 0 20px rgba(0,245,255,0.6)',
              zIndex: 1,
            }}
          />

          {/* Arc Reactor */}
          <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 40 }}>
            {/* Outer ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, ease: 'linear', repeat: Infinity }}
              style={{
                position: 'absolute', inset: 0,
                border: '4px dashed rgba(0,245,255,0.5)',
                borderRadius: '50%',
                boxShadow: '0 0 30px rgba(0,245,255,0.3)',
              }}
            />
            {/* Inner ring */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 3, ease: 'linear', repeat: Infinity }}
              style={{
                position: 'absolute', inset: 10,
                border: '2px solid rgba(0,245,255,0.8)',
                borderRadius: '50%',
                boxShadow: 'inset 0 0 20px rgba(0,245,255,0.5)',
              }}
            />
            {/* Core */}
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
              style={{
                position: 'absolute', inset: 30,
                background: '#00F5FF',
                borderRadius: '50%',
                boxShadow: '0 0 40px #00F5FF, 0 0 80px #00F5FF',
              }}
            />
          </div>

          {/* Greeting Text */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontWeight: 700,
              fontSize: 24,
              color: '#00F5FF',
              textAlign: 'center',
              textShadow: '0 0 15px rgba(0,245,255,0.5)',
              letterSpacing: 3,
              maxWidth: '80%',
              lineHeight: 1.4,
            }}
          >
            {greeting}
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            style={{
              position: 'absolute',
              bottom: 40,
              fontFamily: 'monospace',
              fontSize: 10,
              color: '#6B6B8A',
              letterSpacing: 2,
            }}
          >
            TAP TO DISMISS
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
