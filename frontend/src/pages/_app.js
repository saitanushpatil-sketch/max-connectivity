import { SessionProvider } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import useAuthStore from '../context/authStore';
import '../styles/globals.css';

const PUBLIC_ROUTES = [
  '/login', '/signup', '/offline', 
  '/auth/google-sync', '/api/auth/callback/google'
];

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  const router = useRouter();
  const { init, isAuthenticated, isLoading } = useAuthStore();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    init().finally(() => setAppReady(true));
  }, []);

  useEffect(() => {
    if (!appReady || isLoading) return;
    const isPublic = PUBLIC_ROUTES.some(r => router.pathname.startsWith(r));
    if (!isAuthenticated && !isPublic) {
      router.replace('/login');
    }
  }, [appReady, isAuthenticated, isLoading, router.pathname]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  if (!appReady || isLoading) {
    return (
      <SessionProvider session={session}>
        <div style={{
          position: 'fixed', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#0A0A0F'
        }}>
          <div style={{
            width: 64, height: 64,
            border: '2px solid #00F5FF',
            borderRadius: 4,
            display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            color: '#00F5FF',
            fontFamily: 'Rajdhani, sans-serif',
            fontWeight: 700, fontSize: 18,
            boxShadow: '0 0 30px rgba(0,245,255,0.4)'
          }}>
            MAX
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 16 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: 6, height: 6,
                borderRadius: '50%',
                background: '#00F5FF',
                animation: `bounceDot 1.4s ${i * 0.2}s infinite ease-in-out` 
              }} />
            ))}
          </div>
        </div>
      </SessionProvider>
    );
  }

  return (
    <SessionProvider session={session}>
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', justifyContent: 'center',
        background: '#0A0A0F'
      }}>
        <div style={{
          position: 'relative', width: '100%',
          maxWidth: 448, height: '100%',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <Component {...pageProps} />
        </div>
      </div>
    </SessionProvider>
  );
}
