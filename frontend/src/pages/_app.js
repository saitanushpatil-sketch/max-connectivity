import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { SessionProvider } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import useAuthStore from '../context/authStore';
import { hasStoredToken } from '../utils/api';
import SplashScreen from '../components/ui/SplashScreen';
import PushNotificationInit from '../components/PushNotificationInit';
import CallInit from '../components/call/CallInit';
import { ToastProvider } from '../hooks/useToast';
import ToastContainer from '../components/ui/Toast';
import '../styles/globals.css';

const PUBLIC_ROUTES = ['/login', '/signup', '/offline', '/auth/google-sync', '/search', '/call/[friendId]'];
const SPLASH_KEY = 'max_splash_seen';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
};

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const { init, isAuthenticated, isLoading } = useAuthStore();
  const [showSplash, setShowSplash] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    try {
      const seen = sessionStorage.getItem(SPLASH_KEY);
      setShowSplash(seen !== '1');
    } catch {
      setShowSplash(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading || showSplash) return;
    const isPublic = PUBLIC_ROUTES.includes(router.pathname) || router.pathname.startsWith('/call/');
    const hasToken = hasStoredToken();
    if (!isAuthenticated && !isPublic && !hasToken) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router, showSplash]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onRoute = () => setIsInitialLoad(false);
    router.events.on('routeChangeComplete', onRoute);
    return () => router.events.off('routeChangeComplete', onRoute);
  }, [router.events]);

  const handleSplashComplete = () => {
    try {
      sessionStorage.setItem(SPLASH_KEY, '1');
    } catch {
      /* ignore */
    }
    setShowSplash(false);
    setIsInitialLoad(false);
  };

  if (showSplash === null) {
    return <div className="fixed inset-0" style={{ background: '#0A0A0F' }} />;
  }

  if (showSplash && isInitialLoad) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center hud-bg">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-16 h-16 flex items-center justify-center rounded-sm font-heading font-bold text-2xl"
            style={{
              border: '2px solid #00F5FF',
              color: '#00F5FF',
              boxShadow: '0 0 30px rgba(0,245,255,0.4)',
              animation: 'glowPulse 3s ease-in-out infinite',
            }}
          >
            MAX
          </div>
          <div className="flex gap-1">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
          <span className="font-mono text-xs tracking-widest" style={{ color: '#6B6B8A' }}>
            INITIALIZING SYSTEMS...
          </span>
        </div>
      </div>
    );
  }

  return (
    <SessionProvider>
      <ToastProvider>
        <PushNotificationInit />
        <CallInit />
        <ToastContainer />
        <div className="fixed inset-0 flex justify-center" style={{ background: '#0A0A0F' }}>
          <div className="relative w-full max-w-app h-full flex flex-col overflow-hidden hud-bg scan-line-container">
            <AnimatePresence mode="wait">
              <motion.div
                key={router.pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="flex flex-col flex-1 min-h-0 overflow-hidden"
              >
                <Component {...pageProps} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </ToastProvider>
    </SessionProvider>
  );
}
