"use client";

import { useState } from "react";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium transition hover:border-sign-blue"
    >
      {state === "copied" ? "Zkopírováno ✓" : state === "failed" ? "Nepodařilo se – označte text ručně" : label}
    </button>
  );
}
