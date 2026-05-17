import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import useAuthStore from '../../context/authStore';

export default function GoogleSync() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const setGoogleSession = useAuthStore((s) => s.setGoogleSession);

  useEffect(() => {
    if (status === 'loading') return;

    if (session?.backendToken && session?.backendUser) {
      setGoogleSession(session.backendToken, session.backendUser);
      router.replace('/chats');
      return;
    }

    const error = session?.backendError || 'Google authentication failed';
    router.replace(`/login?error=${encodeURIComponent(error)}`);
  }, [session, status, setGoogleSession, router]);

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
        SYNCING GOOGLE CREDENTIALS...
      </span>
    </div>
  );
}
