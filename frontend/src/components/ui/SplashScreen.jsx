import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

const WELCOME_TEXT = 'WELCOME BACK, OPERATOR';
const PROGRESS_MS = 2500;
const TOTAL_MS = 3000;
const FADE_OUT_MS = 500;

function ArcReactor() {
  return (
    <div className="arc-reactor" aria-hidden="true">
      <div className="arc-ring arc-ring-outer" />
      <div className="arc-ring arc-ring-mid" />
      <div className="arc-ring arc-ring-inner" />
      <div className="arc-hex-wrap">
        <div className="arc-hex" />
      </div>
      <div className="arc-pulse" />
    </div>
  );
}

const fadeUp = (delay) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] },
});

export default function SplashScreen({ onComplete }) {
  const [typed, setTyped] = useState('');
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    let typeInterval;
    const typeDelay = setTimeout(() => {
      let charIndex = 0;
      typeInterval = setInterval(() => {
        charIndex += 1;
        setTyped(WELCOME_TEXT.slice(0, charIndex));
        if (charIndex >= WELCOME_TEXT.length) clearInterval(typeInterval);
      }, 55);
    }, 900);

    const progressStart = performance.now();
    let raf;
    const tickProgress = (now) => {
      const elapsed = now - progressStart;
      const pct = Math.min(100, (elapsed / PROGRESS_MS) * 100);
      setProgress(pct);
      if (elapsed < PROGRESS_MS) raf = requestAnimationFrame(tickProgress);
    };
    raf = requestAnimationFrame(tickProgress);

    const exitTimer = setTimeout(() => setExiting(true), TOTAL_MS);

    return () => {
      clearTimeout(typeDelay);
      clearTimeout(exitTimer);
      if (typeInterval) clearInterval(typeInterval);
      cancelAnimationFrame(raf);
    };
  }, []);

  const handleFadeComplete = () => {
    if (!exiting || completedRef.current) return;
    completedRef.current = true;
    onComplete?.();
  };

  const pctLabel = `${Math.round(progress)}%`;

  return (
    <motion.div
      className="splash"
      initial={{ opacity: 1 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: FADE_OUT_MS / 1000, ease: 'easeInOut' }}
      onAnimationComplete={handleFadeComplete}
    >
      <div className="splash-inner">
        <motion.div className="splash-section splash-top" {...fadeUp(0.15)}>
          <ArcReactor />
        </motion.div>

        <motion.div className="splash-section splash-mid" {...fadeUp(0.35)}>
          <h1 className="splash-title">MAX</h1>
          <p className="splash-subtitle">CONNECTIVITY PROTOCOL</p>
          <p className="splash-typed">
            {typed}
            <span className="splash-caret">|</span>
          </p>
        </motion.div>

        <motion.div className="splash-section splash-bottom" {...fadeUp(0.55)}>
          <div className="splash-progress-block">
            <div
              className="splash-progress-track"
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="splash-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="splash-pct">{pctLabel}</p>
          </div>
        </motion.div>

        <motion.p className="splash-footer" {...fadeUp(0.75)}>
          MAX v2.0 // INITIALIZING...
        </motion.p>
      </div>

      <style jsx>{`
        .splash {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #0a0a0f;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .splash-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 360px;
          padding: 2rem 1.5rem;
          gap: 0;
          box-sizing: border-box;
        }

        .splash-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }

        .splash-top {
          margin-bottom: 2.25rem;
        }

        .splash-mid {
          margin-bottom: 2.5rem;
          text-align: center;
        }

        .splash-bottom {
          width: 100%;
          max-width: 300px;
          margin-bottom: 2rem;
        }

        /* —— Arc reactor 120×120 —— */
        .arc-reactor {
          position: relative;
          width: 120px;
          height: 120px;
          flex-shrink: 0;
        }

        .arc-ring {
          position: absolute;
          border-radius: 50%;
          border: 1.5px solid #00f5ff;
          box-sizing: border-box;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .arc-ring-outer {
          width: 120px;
          height: 120px;
          opacity: 0.35;
          animation:
            arcSpin 14s linear infinite,
            arcGlow 2.4s ease-in-out infinite;
        }

        .arc-ring-mid {
          width: 88px;
          height: 88px;
          opacity: 0.55;
          border-style: dashed;
          animation:
            arcSpinRev 10s linear infinite,
            arcGlow 2s ease-in-out infinite 0.3s;
        }

        .arc-ring-inner {
          width: 58px;
          height: 58px;
          opacity: 0.75;
          animation:
            arcSpin 7s linear infinite,
            arcGlow 1.6s ease-in-out infinite 0.6s;
        }

        @keyframes arcSpin {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }

        @keyframes arcSpinRev {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(-360deg);
          }
        }

        @keyframes arcGlow {
          0%,
          100% {
            box-shadow: 0 0 8px rgba(0, 245, 255, 0.25);
          }
          50% {
            box-shadow:
              0 0 16px rgba(0, 245, 255, 0.55),
              0 0 32px rgba(0, 245, 255, 0.2);
          }
        }

        .arc-hex-wrap {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 2;
        }

        .arc-hex {
          width: 28px;
          height: 28px;
          background: #00f5ff;
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
          box-shadow:
            0 0 12px rgba(0, 245, 255, 0.9),
            0 0 28px rgba(0, 245, 255, 0.5);
          animation: hexPulse 1.8s ease-in-out infinite;
        }

        @keyframes hexPulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.9;
          }
          50% {
            transform: scale(1.08);
            opacity: 1;
          }
        }

        .arc-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 40px;
          height: 40px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0, 245, 255, 0.35) 0%, transparent 70%);
          animation: arcPulse 2s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes arcPulse {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.5;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.4);
            opacity: 0.9;
          }
        }

        /* —— Text block —— */
        .splash-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 48px;
          font-weight: 700;
          line-height: 1;
          letter-spacing: 0.3em;
          color: #00f5ff;
          margin: 0 0 0.65rem;
          padding-left: 0.3em;
          text-shadow:
            0 0 20px rgba(0, 245, 255, 0.6),
            0 0 40px rgba(0, 245, 255, 0.25);
        }

        .splash-subtitle {
          font-family: 'Exo 2', sans-serif;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.35em;
          color: #6b6b8a;
          margin: 0 0 1.25rem;
          text-transform: uppercase;
        }

        .splash-typed {
          font-family: 'Share Tech Mono', monospace;
          font-size: 14px;
          letter-spacing: 0.12em;
          color: #00f5ff;
          margin: 0;
          min-height: 1.25rem;
          text-shadow: 0 0 10px rgba(0, 245, 255, 0.4);
        }

        .splash-caret {
          display: inline-block;
          margin-left: 1px;
          color: #00f5ff;
          animation: caretBlink 0.75s step-end infinite;
        }

        @keyframes caretBlink {
          50% {
            opacity: 0;
          }
        }

        /* —— Progress —— */
        .splash-progress-block {
          width: 100%;
        }

        .splash-progress-track {
          width: 100%;
          height: 4px;
          background: #12121a;
          border: 1px solid #252535;
          border-radius: 2px;
          overflow: hidden;
        }

        .splash-progress-fill {
          height: 100%;
          background: #00f5ff;
          border-radius: 1px;
          box-shadow:
            0 0 8px rgba(0, 245, 255, 0.8),
            0 0 16px rgba(0, 245, 255, 0.35);
          transition: width 0.05s linear;
        }

        .splash-pct {
          font-family: 'Share Tech Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.2em;
          color: #00f5ff;
          text-align: center;
          margin: 0.6rem 0 0;
          text-shadow: 0 0 8px rgba(0, 245, 255, 0.35);
        }

        /* —— Footer —— */
        .splash-footer {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.15em;
          color: #6b6b8a;
          margin: 0;
          text-align: center;
          animation: footerBlink 1.4s ease-in-out infinite;
        }

        @keyframes footerBlink {
          0%,
          100% {
            opacity: 0.35;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </motion.div>
  );
}
