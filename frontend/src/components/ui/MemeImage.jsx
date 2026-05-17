import { useState, memo } from 'react';
import Image from 'next/image';

const FALLBACK_SVG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="#12121A" width="200" height="200"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6B6B8A" font-family="monospace" font-size="14">NO SIGNAL</text></svg>'
  );

function MemeImage({
  src,
  alt = 'Meme',
  className = '',
  fill = false,
  width,
  height,
  sizes,
  priority = false,
  objectFit = 'cover',
}) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgSrc = error || !src ? FALLBACK_SVG : src;

  const imageProps = fill
    ? { fill: true, sizes: sizes || '(max-width: 768px) 33vw, 200px' }
    : { width: width || 300, height: height || 300 };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && !error && (
        <div className="meme-skeleton absolute inset-0 z-0" aria-hidden="true" />
      )}
      <Image
        src={imgSrc}
        alt={alt}
        unoptimized
        loading={priority ? 'eager' : 'lazy'}
        {...imageProps}
        className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${
          fill ? '!absolute inset-0 object-cover' : ''
        }`}
        style={fill ? { objectFit } : undefined}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setError(true);
          setLoaded(true);
        }}
      />
      {!loaded && (
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            background: 'rgba(18,18,26,0.4)',
          }}
          aria-hidden
        />
      )}
    </div>
  );
}

export default memo(MemeImage);
