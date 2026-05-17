export default function SkeletonGrid({ count = 9, cols = 3, className = '' }) {
  return (
    <div className={`grid gap-2 ${className}`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="meme-skeleton aspect-square rounded-sm" />
      ))}
    </div>
  );
}
