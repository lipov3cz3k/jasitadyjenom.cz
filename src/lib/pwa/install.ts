// "Add to home screen": Chromium fires `beforeinstallprompt` and lets us show its dialog later;
// iOS has no such event, so there we explain the Share → Add to Home Screen steps.

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** How we can offer installation: our own button, steps for iOS, or not at all. */
export type InstallMode = "prompt" | "ios" | "none";

export function installMode(env: { standalone: boolean; hasPrompt: boolean; ios: boolean }): InstallMode {
  if (env.standalone) return "none";
  if (env.hasPrompt) return "prompt";
  return env.ios ? "ios" : "none";
}

/** iPhone and iPad; iPadOS reports itself as a Mac, only the touch screen gives it away. */
export function isIos(userAgent: string, maxTouchPoints: number): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// The event can fire before the report form is on screen, so it is caught as soon as this module loads
// and kept here until a component asks for it.
let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // keep the mini-infobar away, we offer the button at the end of a report
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferred;
}

/** Shows the browser's install dialog; the event can be used only once. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  deferred = null;
  notify();
  await event.prompt();
  return (await event.userChoice).outcome === "accepted";
}
