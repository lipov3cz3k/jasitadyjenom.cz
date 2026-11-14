import { describe, expect, it } from "vitest";
import { clientIp, RateLimiter } from "./rate-limit";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe("RateLimiter", () => {
  it("limits a single client within the window", () => {
    const limiter = new RateLimiter({ perClient: 2, perClientWindowMs: HOUR, global: 100, globalWindowMs: DAY });
    expect(limiter.take("a", 0).ok).toBe(true);
    expect(limiter.take("a", 1).ok).toBe(true);
    expect(limiter.take("a", 2)).toEqual({ ok: false, scope: "client", retryAfterSeconds: 3600 });
    expect(limiter.take("b", 3).ok).toBe(true);
    expect(limiter.take("a", HOUR).ok).toBe(true);
  });

  it("applies the global cap across clients", () => {
    const limiter = new RateLimiter({ perClient: 10, perClientWindowMs: HOUR, global: 2, globalWindowMs: DAY });
    expect(limiter.take("a", 0).ok).toBe(true);
    expect(limiter.take("b", 0).ok).toBe(true);
    expect(limiter.take("c", 0)).toMatchObject({ ok: false, scope: "global" });
    expect(limiter.take("c", DAY).ok).toBe(true);
  });

  it("does not count rejected requests", () => {
    const limiter = new RateLimiter({ perClient: 1, perClientWindowMs: HOUR, global: 2, globalWindowMs: DAY });
    limiter.take("a", 0);
    limiter.take("a", 0);
    limiter.take("a", 0);
    expect(limiter.take("b", 0).ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("takes the address appended by the proxy, not the one the client sent", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientIp(new Headers({ "x-forwarded-for": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
