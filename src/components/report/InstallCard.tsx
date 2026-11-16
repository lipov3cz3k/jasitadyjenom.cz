"use client";

import { useState, useSyncExternalStore } from "react";
import {
  getInstallPrompt,
  installMode,
  isIos,
  isStandalone,
  promptInstall,
  subscribeInstallPrompt,
  type InstallMode,
} from "@/lib/pwa/install";

const DISMISSED_KEY = "install-card-dismissed";

const noop = () => () => {};

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function clientMode(hasPrompt: boolean): InstallMode {
  if (readDismissed()) return "none";
  return installMode({
    standalone: isStandalone(),
    hasPrompt,
    ios: isIos(navigator.userAgent, navigator.maxTouchPoints),
  });
}

/** Invitation to add the app to the home screen, shown after a finished notice. */
export function InstallCard() {
  const hasPrompt = useSyncExternalStore(subscribeInstallPrompt, () => getInstallPrompt() !== null, () => false);
  const mode = useSyncExternalStore(noop, () => clientMode(hasPrompt), () => "none" as const);
  const [hidden, setHidden] = useState(false);

  if (mode === "none" || hidden) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // private mode – the card just comes back next time
    }
    setHidden(true);
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-4 text-sm">
      <p className="font-medium">Příště rychleji: přidejte si aplikaci na plochu</p>
      {mode === "prompt" ? (
        <p className="mt-1 text-muted">
          Fotku pak stačí v galerii nasdílet do jasitadyjenom a formulář se otevře s ní. Spustí se i se slabým
          signálem.
        </p>
      ) : (
        <p className="mt-1 text-muted">
          V Safari klepněte na <strong>Sdílet</strong> a zvolte <strong>Přidat na plochu</strong>. Formulář pak
          otevřete jedním klepnutím, i se slabým signálem.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-3">
        {mode === "prompt" && (
          <button
            type="button"
            onClick={async () => {
              if (await promptInstall()) setHidden(true);
            }}
            className="rounded-lg bg-sign-blue px-3 py-1.5 font-medium text-white transition hover:opacity-90"
          >
            Přidat na plochu
          </button>
        )}
        <button type="button" onClick={dismiss} className="px-1 py-1.5 text-muted underline-offset-4 hover:underline">
          {mode === "prompt" ? "Teď ne" : "Rozumím"}
        </button>
      </div>
    </section>
  );
}
