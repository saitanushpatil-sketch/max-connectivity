import { useRouter } from 'next/router';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import useSocket from '../../hooks/useSocket';

const NAV = [
  { href: '/chats', label: 'COMMS', icon: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#00F5FF' : '#6B6B8A'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )},
  { href: '/friends', label: 'SQUAD', icon: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#00F5FF' : '#6B6B8A'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )},
  { href: '/search', label: 'SCAN', icon: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#00F5FF' : '#6B6B8A'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )},
  { href: '/profile', label: 'ID', icon: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#00F5FF' : '#6B6B8A'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  )},
];

export default function BottomNav() {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);

  const fetchCounts = async () => {
    try {
      const [pendRes] = await Promise.all([api.get('/friends/pending')]);
      setPendingRequests(pendRes.data.incoming?.length || 0);
    } catch (_) {}
  };

  useEffect(() => { fetchCounts(); }, [router.pathname]);

  useSocket({
    onNewMessageNotification: () => {
      if (!router.pathname.startsWith('/chat/')) setUnread((u) => u + 1);
    },
  });

  useEffect(() => {
    if (router.pathname === '/chats' || router.pathname.startsWith('/chat/')) {
      setUnread(0);
    }
  }, [router.pathname]);

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app z-50"
      style={{
        background: 'rgba(18, 18, 26, 0.95)',
        borderTop: '1px solid #252535',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Top accent line */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #00F5FF44, transparent)' }} />
      <div className="flex items-center justify-around px-2 py-2">
        {NAV.map(({ href, label, icon }) => {
          const active = router.pathname === href || router.pathname.startsWith(href + '/');
          const isComms = href === '/chats';
          const isSquad = href === '/friends';
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-1 min-w-0 flex-1 relative py-1 group">
              <div className="relative">
                {icon(active)}
                {isComms && unread > 0 && (
                  <span className="unread-badge absolute -top-2 -right-2">{unread > 9 ? '9+' : unread}</span>
                )}
                {isSquad && pendingRequests > 0 && (
                  <span className="unread-badge absolute -top-2 -right-2" style={{ background: '#FF006E' }}>{pendingRequests}</span>
                )}
              </div>
              <span
                className="font-mono text-[9px] tracking-widest transition-colors"
                style={{ color: active ? '#00F5FF' : '#6B6B8A' }}
              >
                {label}
              </span>
              {active && <span className="nav-active-dot" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
