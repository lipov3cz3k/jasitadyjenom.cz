// In-memory rate limiting for the AI endpoint. Cloud Run runs at most a couple of instances,
// so per-instance counters are a good enough brake on costs; the budget alert is the backstop.

export interface RateLimitOptions {
  perClient: number;
  perClientWindowMs: number;
  global: number;
  globalWindowMs: number;
}

interface Window {
  start: number;
  count: number;
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number; scope: "client" | "global" };

export class RateLimiter {
  private readonly clients = new Map<string, Window>();
  private globalWindow: Window = { start: 0, count: 0 };

  constructor(private readonly options: RateLimitOptions) {}

  take(clientKey: string, now = Date.now()): RateLimitResult {
    const { perClient, perClientWindowMs, global, globalWindowMs } = this.options;

    if (now - this.globalWindow.start >= globalWindowMs) this.globalWindow = { start: now, count: 0 };
    if (this.globalWindow.count >= global) {
      return { ok: false, scope: "global", retryAfterSeconds: secondsUntil(this.globalWindow.start + globalWindowMs, now) };
    }

    this.prune(now);
    let client = this.clients.get(clientKey);
    if (!client || now - client.start >= perClientWindowMs) {
      client = { start: now, count: 0 };
      this.clients.set(clientKey, client);
    }
    if (client.count >= perClient) {
      return { ok: false, scope: "client", retryAfterSeconds: secondsUntil(client.start + perClientWindowMs, now) };
    }

    client.count++;
    this.globalWindow.count++;
    return { ok: true };
  }

  private prune(now: number) {
    // Keeps memory bounded without a timer; cheap at the volumes we expect
    if (this.clients.size < 1_000) return;
    for (const [key, w] of this.clients) {
      if (now - w.start >= this.options.perClientWindowMs) this.clients.delete(key);
    }
  }
}

function secondsUntil(time: number, now: number): number {
  return Math.max(1, Math.ceil((time - now) / 1000));
}

/**
 * Client IP behind Cloud Run. Google's front end appends the address it saw to X-Forwarded-For,
 * so the last entry is the one the client cannot forge.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const last = forwarded?.split(",").at(-1)?.trim();
  return last || "unknown";
}
