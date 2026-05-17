import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const JARVIS_TEXT = 'J.A.R.V.I.S ONLINE';
const DURATION_MS = 3000;
const EXIT_MS = 650;

function IronManHelmet() {
  return (
    <div className="splash-helmet" aria-hidden="true">
      <div className="splash-helmet-aura splash-helmet-aura-cyan" />
      <div className="splash-helmet-aura splash-helmet-aura-pink" />

      <svg className="splash-helmet-svg" viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="splashHelmetFill" x1="100" y1="20" x2="100" y2="250" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00F5FF" stopOpacity="0.12" />
            <stop offset="0.5" stopColor="#12121A" stopOpacity="0.9" />
            <stop offset="1" stopColor="#FF006E" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="splashHelmetStroke" x1="0" y1="0" x2="200" y2="260" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00F5FF" />
            <stop offset="0.5" stopColor="#00F5FF" stopOpacity="0.4" />
            <stop offset="1" stopColor="#FF006E" />
          </linearGradient>
          <filter id="splashHelmetGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          className="splash-helmet-outline"
          d="M100 18 C48 18 28 72 28 118 L28 168 C28 210 58 242 100 248 C142 242 172 210 172 168 L172 118 C172 72 152 18 100 18 Z"
          stroke="url(#splashHelmetStroke)"
          strokeWidth="2"
          fill="url(#splashHelmetFill)"
          filter="url(#splashHelmetGlow)"
        />
        <path
          d="M58 128 L142 128 L128 198 L72 198 Z"
          fill="rgba(0,245,255,0.06)"
          stroke="rgba(0,245,255,0.35)"
          strokeWidth="1"
        />
        <path d="M100 48 L100 118" stroke="rgba(0,245,255,0.2)" strokeWidth="1" />
        <path d="M72 88 L128 88" stroke="rgba(255,0,110,0.25)" strokeWidth="1" />
        <rect className="splash-eye splash-eye-left" x="58" y="96" width="30" height="10" rx="2" />
        <rect className="splash-eye splash-eye-right" x="112" y="96" width="30" height="10" rx="2" />
        <path d="M70 210 Q100 228 130 210" stroke="rgba(0,245,255,0.3)" strokeWidth="1.5" fill="none" />
      </svg>

      <div className="splash-helmet-scan splash-helmet-scan-1" />
      <div className="splash-helmet-scan splash-helmet-scan-2" />
    </div>
  );
}

function GlitchText({ children, className = '', as: Tag = 'div', delay = 0 }) {
  return (
    <Tag className={`splash-glitch ${className}`} style={{ animationDelay: `${delay}s` }}>
      <span className="splash-glitch-base">{children}</span>
      <span className="splash-glitch-layer splash-glitch-cyan" aria-hidden="true">
        {children}
      </span>
      <span className="splash-glitch-layer splash-glitch-pink" aria-hidden="true">
        {children}
      </span>
    </Tag>
  );
}

export default function SplashScreen({ onComplete }) {
  const [typed, setTyped] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let charIndex = 0;
    const typeInterval = setInterval(() => {
      charIndex += 1;
      setTyped(JARVIS_TEXT.slice(0, charIndex));
      if (charIndex >= JARVIS_TEXT.length) clearInterval(typeInterval);
    }, 75);

    const welcomeTimer = setTimeout(() => setShowWelcome(true), 1400);
    const exitTimer = setTimeout(() => setExiting(true), DURATION_MS);

    const start = performance.now();
    let raf;
    const tick = (now) => {
      const elapsed = now - start;
      setProgress(Math.min(100, (elapsed / DURATION_MS) * 100));
      if (elapsed < DURATION_MS) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      clearInterval(typeInterval);
      clearTimeout(welcomeTimer);
      clearTimeout(exitTimer);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <motion.div
      className="splash-screen"
      initial={{ opacity: 1, scale: 1, filter: 'brightness(1)' }}
      animate={
        exiting
          ? {
              opacity: 0,
              scale: 1.08,
              x: [0, -8, 12, -16, 20, 0],
              filter: [
                'brightness(1) contrast(1)',
                'brightness(1.6) contrast(1.3) hue-rotate(20deg)',
                'brightness(0.7) contrast(1.8) blur(3px)',
                'brightness(2.5) contrast(2) blur(14px)',
              ],
            }
          : { opacity: 1, scale: 1, x: 0, filter: 'brightness(1)' }
      }
      transition={{ duration: EXIT_MS / 1000, ease: 'easeInOut' }}
      onAnimationComplete={() => {
        if (exiting) onComplete?.();
      }}
    >
      <div className="splash-grid" />
      <div className="splash-grid splash-grid-dense" />
      <div className="splash-vignette" />

      {exiting && <div className="splash-exit-noise" />}

      <div className="splash-content">
        <IronManHelmet />

        <div className="splash-text-block">
          <GlitchText className="splash-jarvis" as="p">
            {typed}
            <span className="splash-cursor">|</span>
          </GlitchText>

          <motion.p
            className="splash-welcome"
            initial={{ opacity: 0, y: 8 }}
            animate={showWelcome ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <GlitchText as="span" delay={0.1}>
              WELCOME BACK, OPERATOR
            </GlitchText>
          </motion.p>

          <GlitchText className="splash-version" as="p" delay={0.2}>
            MAX CONNECTIVITY v2.0
          </GlitchText>
        </div>
      </div>

      <div className="splash-progress-wrap">
        <div className="splash-progress-label">
          <span>SYSTEM BOOT</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="splash-progress-track">
          <div className="splash-progress-fill" style={{ width: `${progress}%` }} />
          <div className="splash-progress-glow" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <style jsx>{`
        .splash-screen {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #0a0a0f;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          font-family: 'Share Tech Mono', monospace;
        }

        .splash-grid {
          position: absolute;
          inset: -50%;
          background-image:
            linear-gradient(rgba(0, 245, 255, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 245, 255, 0.06) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: splashGridDrift 8s linear infinite;
          pointer-events: none;
        }

        .splash-grid-dense {
          background-size: 24px 24px;
          opacity: 0.35;
          animation-duration: 12s;
          animation-direction: reverse;
        }

        @keyframes splashGridDrift {
          0% {
            transform: perspective(500px) rotateX(58deg) translateY(0);
          }
          100% {
            transform: perspective(500px) rotateX(58deg) translateY(48px);
          }
        }

        .splash-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, transparent 30%, #0a0a0f 85%);
          pointer-events: none;
        }

        .splash-exit-noise {
          position: absolute;
          inset: 0;
          z-index: 10;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 245, 255, 0.04) 2px,
            rgba(255, 0, 110, 0.04) 4px
          );
          animation: splashExitNoise 0.12s steps(3) infinite;
          pointer-events: none;
        }

        @keyframes splashExitNoise {
          0% {
            transform: translateY(0) skewX(0deg);
          }
          100% {
            transform: translateY(10px) skewX(2deg);
          }
        }

        .splash-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2rem;
          padding: 0 1.5rem;
        }

        .splash-helmet {
          position: relative;
          width: 200px;
          height: 260px;
        }

        .splash-helmet-aura {
          position: absolute;
          border-radius: 50%;
          filter: blur(40px);
          pointer-events: none;
        }

        .splash-helmet-aura-cyan {
          width: 140px;
          height: 140px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 245, 255, 0.25);
          animation: splashAuraCyan 2s ease-in-out infinite;
        }

        @keyframes splashAuraCyan {
          0%,
          100% {
            opacity: 0.5;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.15);
          }
        }

        .splash-helmet-aura-pink {
          width: 100px;
          height: 80px;
          bottom: 10%;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255, 0, 110, 0.15);
          animation: splashAuraPink 2.5s ease-in-out infinite;
        }

        @keyframes splashAuraPink {
          0%,
          100% {
            opacity: 0.3;
            transform: translateX(-50%) scale(1);
          }
          50% {
            opacity: 0.7;
            transform: translateX(-50%) scale(1.2);
          }
        }

        .splash-helmet-svg {
          width: 100%;
          height: 100%;
          position: relative;
          z-index: 1;
        }

        .splash-helmet-outline {
          animation: splashHelmetPulse 2s ease-in-out infinite;
        }

        @keyframes splashHelmetPulse {
          0%,
          100% {
            filter: drop-shadow(0 0 8px rgba(0, 245, 255, 0.5));
          }
          50% {
            filter: drop-shadow(0 0 20px rgba(0, 245, 255, 0.9))
              drop-shadow(0 0 30px rgba(255, 0, 110, 0.3));
          }
        }

        :global(.splash-eye) {
          fill: #00f5ff;
          filter: drop-shadow(0 0 6px #00f5ff) drop-shadow(0 0 14px #00f5ff);
          animation: splashEyePulse 1.2s ease-in-out infinite;
        }

        :global(.splash-eye-right) {
          animation-delay: 0.15s;
        }

        @keyframes splashEyePulse {
          0%,
          100% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
        }

        .splash-helmet-scan {
          position: absolute;
          left: 8%;
          right: 8%;
          height: 3px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(0, 245, 255, 0.9),
            rgba(255, 0, 110, 0.6),
            transparent
          );
          box-shadow: 0 0 12px rgba(0, 245, 255, 0.8);
          z-index: 3;
          pointer-events: none;
        }

        .splash-helmet-scan-1 {
          animation: splashHelmetScan 2.2s linear infinite;
        }

        .splash-helmet-scan-2 {
          animation: splashHelmetScan 2.2s linear infinite;
          animation-delay: 1.1s;
          opacity: 0.5;
          height: 1px;
        }

        @keyframes splashHelmetScan {
          0% {
            top: 12%;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            top: 88%;
            opacity: 0;
          }
        }

        .splash-text-block {
          text-align: center;
          min-height: 5.5rem;
        }

        .splash-jarvis {
          font-family: 'Rajdhani', sans-serif;
          font-size: 1.35rem;
          font-weight: 700;
          letter-spacing: 0.2em;
          color: #00f5ff;
          text-shadow: 0 0 20px rgba(0, 245, 255, 0.6);
          margin-bottom: 0.75rem;
        }

        .splash-cursor {
          display: inline-block;
          margin-left: 2px;
          animation: splashCursorBlink 0.8s step-end infinite;
          color: #ff006e;
        }

        @keyframes splashCursorBlink {
          50% {
            opacity: 0;
          }
        }

        .splash-welcome {
          font-family: 'Rajdhani', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          letter-spacing: 0.25em;
          color: #e8e8ff;
          margin-bottom: 0.5rem;
        }

        .splash-version {
          font-size: 0.65rem;
          letter-spacing: 0.35em;
          color: #6b6b8a;
        }

        .splash-glitch {
          position: relative;
          display: inline-block;
        }

        .splash-glitch-base {
          position: relative;
          z-index: 1;
        }

        .splash-glitch-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          z-index: 0;
        }

        .splash-glitch-cyan {
          color: #00f5ff;
          animation: splashGlitchCyan 3s infinite;
        }

        .splash-glitch-pink {
          color: #ff006e;
          animation: splashGlitchPink 2.5s infinite;
        }

        @keyframes splashGlitchCyan {
          0%,
          88%,
          100% {
            opacity: 0;
            transform: translate(0);
          }
          90% {
            opacity: 0.8;
            transform: translate(-2px, 1px);
            clip-path: inset(20% 0 60% 0);
          }
          92% {
            opacity: 0;
          }
          94% {
            opacity: 0.6;
            transform: translate(3px, -1px);
            clip-path: inset(60% 0 10% 0);
          }
        }

        @keyframes splashGlitchPink {
          0%,
          85%,
          100% {
            opacity: 0;
            transform: translate(0);
          }
          87% {
            opacity: 0.7;
            transform: translate(2px, -2px);
            clip-path: inset(40% 0 30% 0);
          }
          91% {
            opacity: 0.5;
            transform: translate(-3px, 2px);
            clip-path: inset(10% 0 70% 0);
          }
        }

        .splash-progress-wrap {
          position: absolute;
          bottom: 2.5rem;
          left: 1.5rem;
          right: 1.5rem;
          z-index: 2;
          max-width: 420px;
          margin: 0 auto;
        }

        .splash-progress-label {
          display: flex;
          justify-content: space-between;
          font-size: 0.6rem;
          letter-spacing: 0.2em;
          color: #6b6b8a;
          margin-bottom: 0.5rem;
        }

        .splash-progress-track {
          position: relative;
          height: 4px;
          background: #12121a;
          border: 1px solid #252535;
          border-radius: 2px;
          overflow: hidden;
        }

        .splash-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #00f5ff, #ff006e);
          border-radius: 1px;
          transition: width 0.05s linear;
          box-shadow: 0 0 12px rgba(0, 245, 255, 0.6);
        }

        .splash-progress-glow {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(0, 245, 255, 0.4));
          pointer-events: none;
          transition: width 0.05s linear;
        }
      `}</style>
    </motion.div>
  );
}
