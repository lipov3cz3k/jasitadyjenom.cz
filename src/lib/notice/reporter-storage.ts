import type { Reporter } from "./template";

// Reporter details are stored only on explicit request, and only in this browser.
const KEY = "jasitadyjenom.reporter.v1";

const asString = (v: unknown) => (typeof v === "string" ? v : "");

export function loadReporter(): Reporter | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Record<string, unknown>;
    const reporter = {
      fullName: asString(data.fullName),
      address: asString(data.address),
      dataBoxId: asString(data.dataBoxId),
      email: asString(data.email),
    };
    return reporter.fullName || reporter.address ? reporter : null;
  } catch {
    return null;
  }
}

export function saveReporter(reporter: Reporter): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(reporter));
  } catch {
    // private mode or storage disabled – that's fine
  }
}

export function clearReporter(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // see above
  }
}
