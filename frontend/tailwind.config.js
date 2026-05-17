/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0F',
        surface: '#12121A',
        card: '#1A1A26',
        border: '#252535',
        cyan: '#00F5FF',
        pink: '#FF006E',
        green: '#06D6A0',
        text: '#E8E8FF',
        muted: '#6B6B8A',
        amber: '#FFB703',
        purple: '#8B5CF6',
        orange: '#F97316',
      },
      fontFamily: {
        heading: ['Rajdhani', 'sans-serif'],
        body: ['Exo 2', 'sans-serif'],
        mono: ['Share Tech Mono', 'monospace'],
      },
      boxShadow: {
        cyan: '0 0 20px rgba(0, 245, 255, 0.35)',
        'cyan-sm': '0 0 10px rgba(0, 245, 255, 0.2)',
        pink: '0 0 20px rgba(255, 0, 110, 0.35)',
        green: '0 0 15px rgba(6, 214, 160, 0.35)',
      },
      animation: {
        'bounce-dot': 'bounceDot 1.4s infinite ease-in-out',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'scan-line': 'scanLine 3s linear infinite',
      },
      keyframes: {
        bounceDot: {
          '0%, 80%, 100%': { transform: 'scale(0)', opacity: '0.3' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(0, 245, 255, 0.2)' },
          '50%': { boxShadow: '0 0 25px rgba(0, 245, 255, 0.5)' },
        },
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      maxWidth: { app: '448px' },
    },
  },
  plugins: [],
};
