import { useEffect } from 'react';
import useAuthStore from '../context/authStore';
import usePushNotifications from '../hooks/usePushNotifications';

export default function PushNotificationInit() {
  const { isAuthenticated } = useAuthStore();
  const { checkSubscribed } = usePushNotifications();

  useEffect(() => {
    if (!isAuthenticated) return;
    checkSubscribed();
  }, [isAuthenticated, checkSubscribed]);

  return null;
}
