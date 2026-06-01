import { useState, useCallback, useRef } from 'react';

export const useWindNotification = () => {
  const [current, setCurrent] = useState(null);
  const timerRef = useRef(null);

  const show = useCallback((notification) => {
    // Clear any existing notification timer
    if (timerRef.current) clearTimeout(timerRef.current);

    const id = Date.now();
    const notif = { ...notification, id };
    setCurrent(notif);

    // Auto-clear after 4.5s (slightly longer than the 4s animation)
    timerRef.current = setTimeout(() => {
      setCurrent(null);
      timerRef.current = null;
    }, 4500);
  }, []);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrent(null);
    timerRef.current = null;
  }, []);

  return { current, show, dismiss };
};
