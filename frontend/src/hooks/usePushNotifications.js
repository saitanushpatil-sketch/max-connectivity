import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PROMPT_KEY = 'max_push_prompted';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window &&
      !!VAPID_PUBLIC_KEY;
    setIsSupported(supported);
    if (supported && typeof Notification !== 'undefined') setPermission(Notification.permission);
  }, []);

  const getRegistration = async () => {
    await navigator.serviceWorker.register('/sw.js');
    return navigator.serviceWorker.ready;
  };

  const checkSubscribed = useCallback(async () => {
    if (!isSupported) return false;
    try {
      const reg = await getRegistration();
      const sub = await reg.pushManager.getSubscription();
      const active = !!sub;
      setIsSubscribed(active);
      return active;
    } catch {
      setIsSubscribed(false);
      return false;
    }
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (typeof window === 'undefined' || !isSupported) return false;
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== 'granted') return false;

      const reg = await getRegistration();
      let subscription = await reg.pushManager.getSubscription();

      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      await api.post('/push/subscribe', {
        subscription: subscription.toJSON(),
      });

      setIsSubscribed(true);
      return true;
    } catch (err) {
      setIsSubscribed(false);
      return false;
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return false;
    try {
      const reg = await getRegistration();
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();
      await api.post('/push/unsubscribe');
      setIsSubscribed(false);
      return true;
    } catch (err) {
      return false;
    }
  }, [isSupported]);

  const tryAutoSubscribe = useCallback(async () => {
    if (!isSupported) return;
    try {
      const already = await checkSubscribed();
      if (already) return;

      const prompted = localStorage.getItem(PROMPT_KEY);
      if (prompted) return;
      localStorage.setItem(PROMPT_KEY, '1');

      if (Notification.permission === 'granted') {
        await subscribe();
      } else if (Notification.permission === 'default') {
        await subscribe();
      }
    } catch (_) {
      /* ignore */
    }
  }, [isSupported, checkSubscribed, subscribe]);

  return {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
    checkSubscribed,
    tryAutoSubscribe,
  };
}
