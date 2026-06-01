import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import useAuthStore from '../../context/authStore';
import api from '../../utils/api';

/**
 * This page handles the Google OAuth implicit redirect.
 * When Google redirects back with #access_token=..., we use it to
 * fetch the user's profile, then send it to our backend.
 */
export default function GoogleSync() {
  const router = useRouter();
  const setGoogleSession = useAuthStore((s) => s.setGoogleSession);
  const [status, setStatus] = useState('SYNCING GOOGLE CREDENTIALS...');

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Extract access_token from URL hash fragment
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');

        if (!accessToken) {
          setStatus('NO CREDENTIALS FOUND');
          setTimeout(() => router.replace('/login?error=Google+authentication+failed'), 1500);
          return;
        }

        // Fetch Google user info with the access token
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error('Failed to fetch Google profile');
        const profile = await res.json();

        if (!profile.email || !profile.sub) {
          throw new Error('Invalid Google profile');
        }

        // Send to our backend
        setStatus('AUTHENTICATING...');
        const { data } = await api.post('/auth/google', {
          email: profile.email,
          name: profile.name,
          googleId: profile.sub,
        });

        if (!data.token || !data.user) throw new Error('Backend auth failed');

        setGoogleSession(data.token, data.user);
        setStatus('ACCESS GRANTED');
        setTimeout(() => router.replace('/chats'), 500);
      } catch (err) {
        console.error('Google sync error:', err);
        const msg = err.response?.data?.error || err.message || 'Authentication failed';
        router.replace(`/login?error=${encodeURIComponent(msg)}`);
      }
    };

    handleAuth();
  }, []);

  return (
    <div className="flex flex-col h-full items-center justify-center gap-4">
      <div
        className="w-16 h-16 flex items-center justify-center rounded-sm font-heading font-bold text-2xl"
        style={{
          border: '2px solid #00F5FF',
          color: '#00F5FF',
          boxShadow: '0 0 30px rgba(0,245,255,0.4)',
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
        {status}
      </span>
    </div>
  );
}
