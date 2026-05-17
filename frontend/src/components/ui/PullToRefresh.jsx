import { useState, useRef, useCallback } from 'react';

export default function PullToRefresh({ onRefresh, children, className = '' }) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pullDistance = useRef(0);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    pullDistance.current = 0;
  }, []);

  const handleTouchMove = useCallback((e) => {
    const el = containerRef.current;
    if (!el || el.scrollTop > 0 || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && dy < 120) {
      pullDistance.current = dy;
      setPulling(dy > 50);
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance.current > 50 && !refreshing) {
      setRefreshing(true);
      setPulling(false);
      try {
        await onRefresh?.();
      } finally {
        setRefreshing(false);
      }
    } else {
      setPulling(false);
    }
    pullDistance.current = 0;
  }, [onRefresh, refreshing]);

  return (
    <div className={`relative flex flex-col flex-1 min-h-0 ${className}`}>
      {(pulling || refreshing) && (
        <div
          className="absolute top-0 left-0 right-0 z-10 flex justify-center py-2 font-mono text-[10px] tracking-widest"
          style={{ color: '#00F5FF' }}
        >
          {refreshing ? 'SYNCING...' : 'RELEASE TO REFRESH'}
        </div>
      )}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto min-h-0"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
