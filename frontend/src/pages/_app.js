import { useEffect } from 'react';
import { useRouter } from 'next/router';
import useAuthStore from '../context/authStore';
import '../styles/globals.css';

const PUBLIC_ROUTES = ['/login', '/signup', '/offline'];

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const { init, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const isPublic = PUBLIC_ROUTES.includes(router.pathname);
    if (!isAuthenticated && !isPublic) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router.pathname]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

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
              animation: 'glowPulse 1.5s ease-in-out infinite',
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
    <div className="fixed inset-0 flex justify-center" style={{ background: '#0A0A0F' }}>
      <div className="relative w-full max-w-app h-full flex flex-col overflow-hidden hud-bg scan-line-container">
        <Component {...pageProps} />
      </div>
    </div>
  );
}
