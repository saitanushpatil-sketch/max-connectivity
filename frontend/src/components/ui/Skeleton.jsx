export default function Skeleton({ className = '', style = {}, width, height, rounded = 'sm' }) {
  const radius = rounded === 'full' ? '9999px' : rounded === 'none' ? '0' : '4px';
  return (
    <div
      className={`skeleton-pulse ${className}`}
      style={{
        width: width || '100%',
        height: height || '16px',
        borderRadius: radius,
        background: '#1A1A26',
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export function SkeletonRow({ lines = 2 }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid #1A1A26' }}>
      <Skeleton width={46} height={46} rounded="sm" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton width="60%" height={14} />
        {lines > 1 && <Skeleton width="40%" height={10} />}
      </div>
    </div>
  );
}
