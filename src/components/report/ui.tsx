// Small building blocks shared by the report screens.

export const inputClass = "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base sm:text-sm";

const STEPS = ["Fotky", "Kontrola", "Podnět"] as const;

export function ScreenHeader({ step, title, onBack }: { step: 1 | 2 | 3; title: string; onBack?: () => void }) {
  return (
    <header className="mb-6">
      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        {onBack ? (
          <button type="button" onClick={onBack} className="-ml-1 px-1 py-1 font-medium hover:text-foreground">
            ← Zpět
          </button>
        ) : (
          <span />
        )}
        <span>
          Krok {step} ze {STEPS.length}
        </span>
      </div>
      <ol className="mt-3 grid grid-cols-3 gap-1.5" aria-hidden>
        {STEPS.map((label, i) => (
          <li key={label} className={`h-1.5 rounded-full ${i < step ? "bg-sign-blue" : "bg-border"}`} />
        ))}
      </ol>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight">{title}</h2>
    </header>
  );
}

/** Primary action: stuck to the bottom of the screen on phones, inline on wider screens. */
export function ActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-5 mt-8 border-t border-border bg-background/95 px-5 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-xl bg-sign-blue px-5 py-3.5 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-40 sm:w-auto"
    >
      {children}
    </button>
  );
}

/** A labelled block on the review screen. */
export function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        {aside}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function AiBadge() {
  return (
    <span className="rounded-full bg-sign-blue/10 px-2 py-0.5 text-xs font-medium text-sign-blue">
      návrh AI – zkontrolujte
    </span>
  );
}

export function FieldLabel({ suggested, children }: { suggested?: boolean; children: React.ReactNode }) {
  return (
    <span className="flex flex-wrap items-center gap-2 font-medium">
      {children}
      {suggested && <AiBadge />}
    </span>
  );
}

export function Spinner() {
  return (
    <span
      className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent align-[-2px]"
      aria-hidden
    />
  );
}
