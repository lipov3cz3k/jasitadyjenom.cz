export function NoStoppingSign({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="var(--color-sign-red)" />
      <circle cx="50" cy="50" r="34" fill="var(--color-sign-blue)" />
      <g stroke="var(--color-sign-red)" strokeWidth="10">
        <line x1="22" y1="22" x2="78" y2="78" />
        <line x1="78" y1="22" x2="22" y2="78" />
      </g>
    </svg>
  );
}
