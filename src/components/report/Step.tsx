export function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`krok-${number}`}>
      <h2 id={`krok-${number}`} className="mb-5 flex items-center gap-3 text-xl font-semibold tracking-tight">
        <span className="flex size-8 items-center justify-center rounded-full bg-line-yellow text-sm font-bold text-black">
          {number}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}
