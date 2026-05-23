import { memo } from 'react';
import Link from 'next/link';
import BottomNav from '../components/ui/BottomNav';

function Calls() {
  const recentCalls = []; // Empty state for now

  return (
    <div className="flex flex-col h-full pb-16">
      <div className="px-4 pt-10 pb-3" style={{ borderBottom: '1px solid #252535' }}>
        <div className="font-mono text-[10px] tracking-widest mb-0.5" style={{ color: '#6B6B8A' }}>SYS://CALLS</div>
        <h1 className="font-heading text-2xl font-bold tracking-wider" style={{ color: '#00F5FF', textShadow: '0 0 15px rgba(0,245,255,0.3)' }}>
          CALLS
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {recentCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center min-h-[300px]">
            <div className="w-16 h-16 flex items-center justify-center rounded-sm" style={{ border: '1px solid #252535', background: '#12121A' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00F5FF" strokeWidth="1.5">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            <div>
              <p className="font-heading text-lg" style={{ color: '#E8E8FF' }}>NO RECENT TRANSMISSIONS</p>
              <p className="font-mono text-xs mt-1" style={{ color: '#6B6B8A' }}>Start a call from the SQUAD tab</p>
            </div>
            <Link href="/friends" className="hud-btn hud-btn-primary px-6 py-2 rounded-sm text-xs mt-4">
              VIEW SQUAD
            </Link>
          </div>
        ) : (
          recentCalls.map((call, idx) => (
            <div key={idx} className="p-4" style={{ borderBottom: '1px solid #1A1A26' }}>
               {/* Call item template placeholder */}
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
}

export default memo(Calls);
