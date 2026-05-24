import Link from 'next/link';



export default function Offline() {
  return (
    <div className="flex flex-col h-full items-center justify-center gap-6 px-8 hud-bg">
      <div className="w-20 h-20 flex items-center justify-center rounded-sm" style={{ border: '2px solid #252535', background: '#12121A' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FF006E" strokeWidth="1.5" strokeLinecap="round">
          <line x1="1" y1="1" x2="23" y2="23"/>
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
          <line x1="12" y1="20" x2="12.01" y2="20"/>
        </svg>
      </div>
      <div className="text-center">
        <div className="font-mono text-[10px] tracking-widest mb-2" style={{ color: '#6B6B8A' }}>SYS://ERROR_0x001</div>
        <h1 className="font-heading text-2xl font-bold tracking-wider" style={{ color: '#FF006E' }}>SIGNAL LOST</h1>
        <p className="font-mono text-xs mt-2 leading-relaxed" style={{ color: '#6B6B8A' }}>
          No network connection detected.<br />Check your connection and retry.
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="hud-btn hud-btn-primary px-8 py-3 rounded-sm text-xs"
      >
        ↺ RETRY CONNECTION
      </button>
      <Link href="/" className="font-mono text-xs tracking-widest" style={{ color: '#6B6B8A' }}>BACK TO BASE</Link>
    </div>
  );
}
