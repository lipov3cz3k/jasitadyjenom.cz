const tones = {
  info: "border-sign-blue/30 bg-sign-blue/5",
  warning: "border-line-yellow/60 bg-line-yellow/10",
  error: "border-sign-red/40 bg-sign-red/5",
} as const;

export function Notice({ tone, children }: { tone: keyof typeof tones; children: React.ReactNode }) {
  return (
    <p role={tone === "error" ? "alert" : undefined} className={`rounded-lg border p-3 text-sm ${tones[tone]}`}>
      {children}
    </p>
  );
}
