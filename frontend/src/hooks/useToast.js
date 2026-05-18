import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((toastData) => {
    const id = ++toastId;
    const duration = toastData.duration || (toastData.type === 'call' ? 30000 : 4000);
    
    setToasts((prev) => {
      // Limit to max 3 toasts visible at once
      const current = [...prev, { id, ...toastData }];
      if (current.length > 3) return current.slice(current.length - 3);
      return current;
    });

    if (duration !== Infinity) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
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
      toast: { 
        success: () => {}, 
        error: () => {}, 
        info: () => {},
        message: () => {},
        call: () => {}
      },
      toasts: [],
      dismiss: () => {},
    };
  }
  return {
    showToast: ctx.showToast,
    toast: {
      success: (msg) => ctx.showToast({ body: msg, type: 'success' }),
      error: (msg) => ctx.showToast({ body: msg, type: 'error' }),
      info: (msg) => ctx.showToast({ body: msg, type: 'info' }),
      message: (sender, content, onAction) => ctx.showToast({ sender, body: content, type: 'message', onAction }),
      call: (sender, callType, onAction) => ctx.showToast({ sender, body: `Incoming ${callType} call`, type: 'call', onAction, duration: 30000 }),
    },
    toasts: ctx.toasts,
    dismiss: ctx.dismiss,
  };
}
