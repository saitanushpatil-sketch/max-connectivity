import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import useAuthStore from '../context/authStore';
import useCallStore, { storeCallToSession } from '../context/callStore';
import Head from 'next/head';
import { getSocket } from '../hooks/useSocket';
import useSocket from '../hooks/useSocket';
import IncomingCallModal from '../components/call/IncomingCallModal';
import GreetingOverlay from '../components/ui/GreetingOverlay';
import WindNotification from '../components/ui/WindNotification';
import NotificationToast from '../components/ui/NotificationToast';
import { useWindNotification } from '../hooks/useWindNotification';
import { ToastProvider } from '../hooks/useToast';
import useToast from '../hooks/useToast';
import { AnimatePresence, motion } from 'framer-motion';
import '../styles/globals.css';

const PUBLIC_ROUTES = [
  '/login', '/signup', '/offline',
  '/auth/google-sync', '/api/auth/callback/google',
  '/call',
];

function AppInner({ Component, pageProps }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const { incomingCall, setIncomingCall, clearIncomingCall } = useCallStore();
  const [socketConnected, setSocketConnected] = useState(true);
  const { current: windNotif, show: showWind, dismiss: dismissWind } = useWindNotification();
  const { toasts, dismiss: dismissToast } = useToast();

  useSocket({
    onConnect: () => setSocketConnected(true),
    onDisconnect: () => setSocketConnected(false),
    onCallIncoming: (data) => {
      setIncomingCall(data);
    },
    onNewMessageNotification: (data) => {
      // Don't show wind notification if we're on the same chat page
      const currentConvId = router.query.convId;
      if (currentConvId && data.conversationId === currentConvId) return;

      const from = data.from || {};
      const msg = data.message || {};
      const body = msg.type === 'voice' ? '🎤 Voice message' :
                   msg.type === 'gif' ? '🎞️ GIF' :
                   msg.type === 'meme' ? '🎭 Meme' :
                   (msg.content || '').substring(0, 60);

      showWind({
        title: from.displayName || from.username || 'New Message',
        body,
        avatarColor: from.avatarColor,
        icon: '💬',
      });
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
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover, interactive-widget=resizes-content" />
      </Head>
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

      {/* Wind notification — global overlay */}
      <WindNotification notification={windNotif} onClose={dismissWind} />

      {/* Toast notifications — rendered at the top */}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 420, zIndex: 9998,
          display: 'flex', flexDirection: 'column', gap: 8,
          padding: '0 12px',
          pointerEvents: 'none',
        }}>
          {toasts.map((toast) => (
            <div key={toast.id} style={{ pointerEvents: 'auto' }}>
              <NotificationToast
                toast={toast}
                onDismiss={dismissToast}
                onAction={toast.onAction}
              />
            </div>
          ))}
        </div>
      )}

      {/* Incoming call modal - global */}
      {incomingCall && (
        <IncomingCallModal
          caller={incomingCall.fromUser || incomingCall.caller}
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
          <AnimatePresence mode="wait">
            <motion.div
              key={router.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              layout={false}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', willChange: 'opacity' }}
            >
              <Component {...pageProps} />
            </motion.div>
          </AnimatePresence>
          <GreetingOverlay />
        </div>
      </div>
    </>
  );
}

export default function App({ Component, pageProps }) {
  const { init, isAuthenticated, isLoading } = useAuthStore();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    init().finally(() => setAppReady(true));
  }, []);

  if (!appReady || isLoading) {
    return (
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
    );
  }

  return (
    <ToastProvider>
      <AppInner Component={Component} pageProps={pageProps} />
    </ToastProvider>
  );
}
