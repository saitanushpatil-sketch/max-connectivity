import { AnimatePresence, motion } from 'framer-motion';
import useToast from '../../hooks/useToast';
import NotificationToast from './NotificationToast';

export default function ToastContainer() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-app px-4 pointer-events-none flex flex-col gap-2 items-center">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="pointer-events-auto w-full flex justify-center"
          >
            <NotificationToast
              toast={t}
              onDismiss={dismiss}
              onAction={(toast) => {
                if (toast.onAction) {
                  toast.onAction(toast);
                }
                dismiss(toast.id);
              }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
