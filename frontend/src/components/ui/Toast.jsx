import { AnimatePresence, motion } from 'framer-motion';
import useToast from '../../hooks/useToast';

const TYPE_STYLES = {
  success: { border: '#06D6A0', color: '#06D6A0', bg: 'rgba(6,214,160,0.12)' },
  error: { border: '#FF006E', color: '#FF006E', bg: 'rgba(255,0,110,0.12)' },
  info: { border: '#00F5FF', color: '#00F5FF', bg: 'rgba(0,245,255,0.12)' },
};

export default function ToastContainer() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-app px-4 pointer-events-none flex flex-col gap-2 items-center">
      <AnimatePresence>
        {toasts.map((t) => {
          const s = TYPE_STYLES[t.type] || TYPE_STYLES.info;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto w-full max-w-sm px-4 py-3 rounded-sm font-mono text-xs tracking-wide"
              style={{
                background: s.bg,
                border: `1px solid ${s.border}`,
                color: s.color,
                boxShadow: `0 4px 20px ${s.border}33`,
              }}
              onClick={() => dismiss(t.id)}
            >
              {t.message}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
