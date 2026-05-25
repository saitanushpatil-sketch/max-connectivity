import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

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

export default function GoogleLoginButton() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ 
        url: `${process.env.NEXT_PUBLIC_API_URL}/auth/google`,
        windowName: '_system'
      });
    } else {
      signIn('google', { callbackUrl: '/auth/google-sync' });
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
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
  );
}
