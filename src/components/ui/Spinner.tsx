'use client';

interface SpinnerProps {
  /** Size in pixels. Default: 20 */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Minimal animated spinner — replaces raw "Loading..." text throughout the app.
 * Uses the app's primary color via currentColor.
 */
export function Spinner({ size = 20, className = '' }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Loading"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Full-screen centered spinner for page-level loading states.
 */
export function PageSpinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-muted-foreground flex flex-col items-center gap-3">
        <Spinner size={32} />
        <p className="text-sm">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Inline spinner with optional label — for buttons or inline loading states.
 */
export function InlineSpinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Spinner size={16} />
      {label && <span className="text-sm">{label}</span>}
    </span>
  );
}
