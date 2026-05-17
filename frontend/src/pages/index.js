import { useEffect } from 'react';
import { useRouter } from 'next/router';
import useAuthStore from '../context/authStore';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    router.replace(isAuthenticated ? '/chats' : '/login');
  }, [isAuthenticated, isLoading]);

  return null;
}
