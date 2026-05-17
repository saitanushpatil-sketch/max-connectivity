export default function HudButton({
  children,
  isLoading = false,
  disabled = false,
  variant = 'primary',
  className = '',
  style = {},
  ...props
}) {
  const variants = {
    primary: 'hud-btn hud-btn-primary',
    ghost: 'hud-btn hud-btn-ghost',
    danger: 'hud-btn',
  };

  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      className={`${variants[variant] || variants.primary} ${className} relative`}
      style={{ opacity: disabled || isLoading ? 0.7 : 1, ...style }}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-1.5">
          <span className="hud-spinner" />
          <span className="font-mono text-[10px] tracking-widest">PROCESSING...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
