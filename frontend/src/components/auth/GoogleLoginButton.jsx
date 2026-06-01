import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import api from '../../utils/api';
import useAuthStore from '../../context/authStore';
import { useRouter } from 'next/router';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  || '522554987461-nhn2f4u7u1uhmbkglipqril1r5n7on0f.apps.googleusercontent.com';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/** Decode a Google JWT credential to extract user info */
function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function GoogleLoginButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setGoogleSession = useAuthStore((s) => s.setGoogleSession);
  const router = useRouter();
  const btnRef = useRef(null);
  const initialized = useRef(false);

  // Handle the Google credential response
  const handleCredentialResponse = async (response) => {
    setLoading(true);
    setError('');
    try {
      const decoded = decodeJwt(response.credential);
      if (!decoded?.email) throw new Error('Invalid Google response');

      // Send to our backend — same endpoint the old NextAuth callback used
      const { data } = await api.post('/auth/google', {
        email: decoded.email,
        name: decoded.name,
        googleId: decoded.sub,
      });

      if (!data.token || !data.user) throw new Error('Backend auth failed');

      // Store session and redirect
      setGoogleSession(data.token, data.user);
      router.replace('/chats');
    } catch (err) {
      console.error('Google auth error:', err);
      setError(err.response?.data?.error || err.message || 'Google login failed');
      setLoading(false);
    }
  };

  // Load the Google Identity Services script
  useEffect(() => {
    if (typeof window === 'undefined' || Capacitor.isNativePlatform()) return;
    if (initialized.current) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      initialized.current = true;
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup: don't remove script to avoid re-init issues
    };
  }, []);

  const handleClick = () => {
    if (loading) return;
    setError('');

    if (Capacitor.isNativePlatform()) {
      // For native apps, open browser-based OAuth
      import('@capacitor/browser').then(({ Browser }) => {
        Browser.open({
          url: `${process.env.NEXT_PUBLIC_API_URL}/auth/google`,
          windowName: '_system',
        });
      });
      return;
    }

    // Use Google One Tap / popup
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback: use OAuth popup redirect
          const redirectUri = window.location.origin + '/auth/google-sync/';
          const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${GOOGLE_CLIENT_ID}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&response_type=token` +
            `&scope=${encodeURIComponent('openid email profile')}` +
            `&prompt=consent`;
          window.location.href = oauthUrl;
        }
      });
    } else {
      setError('Google Sign-In not loaded — please try again');
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full py-3 px-4 rounded-sm flex items-center justify-center gap-3 font-mono text-xs tracking-widest transition-all"
        style={{
          background: '#0A0A0F',
          border: '1px solid #00F5FF',
          color: '#E8E8FF',
          boxShadow: '0 0 12px rgba(0,245,255,0.15), inset 0 0 20px rgba(0,245,255,0.03)',
          opacity: loading ? 0.7 : 1,
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(0,245,255,0.35), inset 0 0 24px rgba(0,245,255,0.06)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 0 12px rgba(0,245,255,0.15), inset 0 0 20px rgba(0,245,255,0.03)';
        }}
        ref={btnRef}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
          </span>
        ) : (
          <>
            <GoogleIcon />
            <span>GOOGLE ACCESS</span>
          </>
        )}
      </button>
      {error && (
        <div
          className="mt-2 px-3 py-2 rounded-sm font-mono text-xs text-center"
          style={{ background: 'rgba(255,0,110,0.1)', border: '1px solid rgba(255,0,110,0.3)', color: '#FF006E' }}
        >
          ⚠ {error.toUpperCase()}
        </div>
      )}
    </div>
  );
}
