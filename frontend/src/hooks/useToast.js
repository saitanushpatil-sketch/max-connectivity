import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismiss, toasts }}>
      {children}
    </ToastContext.Provider>
  );
}

export default function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: () => {},
      toast: { success: () => {}, error: () => {}, info: () => {} },
    };
  }
  return {
    showToast: ctx.showToast,
    toast: {
      success: (msg) => ctx.showToast(msg, 'success'),
      error: (msg) => ctx.showToast(msg, 'error'),
      info: (msg) => ctx.showToast(msg, 'info'),
    },
    toasts: ctx.toasts,
    dismiss: ctx.dismiss,
  };
}
