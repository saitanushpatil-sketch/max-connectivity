import { useEffect } from 'react';
import useAuthStore from '../context/authStore';
import usePushNotifications from '../hooks/usePushNotifications';

export default function PushNotificationInit() {
  const { isAuthenticated } = useAuthStore();
  const { tryAutoSubscribe, checkSubscribed } = usePushNotifications();

  useEffect(() => {
    if (!isAuthenticated) return;
    checkSubscribed();
    tryAutoSubscribe();
  }, [isAuthenticated, checkSubscribed, tryAutoSubscribe]);

  return null;
}
