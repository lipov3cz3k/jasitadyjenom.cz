"use client";

import { useSyncExternalStore } from "react";
import {
  getThemePreference,
  setThemePreference,
  subscribeThemePreference,
  type ThemePreference,
} from "@/lib/theme";

const NEXT: Record<ThemePreference, ThemePreference> = { system: "light", light: "dark", dark: "system" };

const LABEL: Record<ThemePreference, string> = {
  system: "Vzhled podle systému",
  light: "Světlý vzhled",
  dark: "Tmavý vzhled",
};

export function ThemeToggle() {
  const preference = useSyncExternalStore(
    subscribeThemePreference,
    getThemePreference,
    () => "system" as const,
  );
  const next = NEXT[preference];

  return (
    <button
      type="button"
      onClick={() => setThemePreference(next)}
      className="flex size-9 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-foreground"
      aria-label={`${LABEL[preference]}. Přepnout na: ${LABEL[next].toLowerCase()}`}
      title={LABEL[preference]}
    >
      <ThemeIcon preference={preference} />
    </button>
  );
}

function ThemeIcon({ preference }: { preference: ThemePreference }) {
  const common = {
    className: "size-4.5",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (preference === "light") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    );
  }
  if (preference === "dark") {
    return (
      <svg {...common}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
