import { SessionProvider } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import useAuthStore from '../context/authStore';
import useCallStore, { storeCallToSession } from '../context/callStore';
import { getSocket } from '../hooks/useSocket';
import useSocket from '../hooks/useSocket';
import IncomingCallModal from '../components/call/IncomingCallModal';
import '../styles/globals.css';

const PUBLIC_ROUTES = [
  '/login', '/signup', '/offline',
  '/auth/google-sync', '/api/auth/callback/google',
  '/call/',
];

function AppInner({ Component, pageProps }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const { incomingCall, setIncomingCall, clearIncomingCall } = useCallStore();
  const [socketConnected, setSocketConnected] = useState(true);

  useSocket({
    onConnect: () => setSocketConnected(true),
    onDisconnect: () => setSocketConnected(false),
    onCallIncoming: (data) => {
      setIncomingCall(data);
    },
  });

  useEffect(() => {
    if (isLoading) return;
    const isPublic = PUBLIC_ROUTES.some(r => router.pathname.startsWith(r));
    if (!isAuthenticated && !isPublic) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router.pathname]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const handleAcceptCall = useCallback(() => {
    if (!incomingCall) return;
    const { callerId, from, callType } = incomingCall;
    const targetId = from || callerId;
    // Persist call data across navigation
    storeCallToSession(incomingCall);
    clearIncomingCall();
    router.push(`/call/${targetId}?type=${callType || 'video'}&incoming=true`);
  }, [incomingCall, clearIncomingCall, router]);

  const handleRejectCall = useCallback(() => {
    if (incomingCall) {
      const socket = getSocket();
      const targetId = incomingCall.from || incomingCall.callerId;
      socket?.emit('call:reject', { to: targetId });
    }
    clearIncomingCall();
  }, [incomingCall, clearIncomingCall]);

  return (
    <>
      {/* Reconnection banner */}
      {!socketConnected && isAuthenticated && (
        <div style={{
          position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 448, zIndex: 9000,
          background: 'rgba(255,183,3,0.15)',
          borderBottom: '1px solid rgba(255,183,3,0.3)',
          padding: '6px 0',
          textAlign: 'center',
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: 10,
          letterSpacing: 2,
          color: '#FFB703',
        }}>
          ● RECONNECTING...
        </div>
      )}

      {/* Incoming call modal - global */}
      {incomingCall && (
        <IncomingCallModal
          caller={incomingCall.caller}
          callType={incomingCall.callType}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

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
          <Component {...pageProps} key={router.pathname} />
        </div>
      </div>
    </>
  );
}

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  const { init, isAuthenticated, isLoading } = useAuthStore();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    init().finally(() => setAppReady(true));
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
      <AppInner Component={Component} pageProps={pageProps} />
    </SessionProvider>
  );
}

