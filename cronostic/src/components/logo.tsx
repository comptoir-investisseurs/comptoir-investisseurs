export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-[0.14em] ${className}`}>
      <span className="font-display text-[1.05em] tracking-[0.34em] uppercase">Cronostic</span>
    </span>
  );
}

/** Petit repère gravé, décliné du balancier annulaire. */
export function Marque({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="16" cy="16" r="14.25" stroke="currentColor" strokeWidth="1.1" opacity="0.55" />
      <circle cx="16" cy="16" r="8.5" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="16" cy="16" r="1.6" fill="currentColor" />
      <path d="M16 1.75V6M16 26v4.25M1.75 16H6M26 16h4.25" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="16" cy="7.5" r="1.15" fill="currentColor" opacity="0.8" />
      <circle cx="16" cy="24.5" r="1.15" fill="currentColor" opacity="0.8" />
      <circle cx="7.5" cy="16" r="1.15" fill="currentColor" opacity="0.8" />
      <circle cx="24.5" cy="16" r="1.15" fill="currentColor" opacity="0.8" />
    </svg>
  );
}
