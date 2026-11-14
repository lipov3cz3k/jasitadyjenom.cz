import { describe, expect, it } from "vitest";
import { checkRequestSize, MAX_REQUEST_BYTES } from "./request-size";

const headers = (length?: string) => new Headers(length === undefined ? {} : { "content-length": length });

describe("checkRequestSize", () => {
  it("accepts a request up to the limit", () => {
    expect(checkRequestSize(headers("1234"))).toEqual({ ok: true });
    expect(checkRequestSize(headers(String(MAX_REQUEST_BYTES)))).toEqual({ ok: true });
  });

  it("rejects a larger request", () => {
    expect(checkRequestSize(headers(String(MAX_REQUEST_BYTES + 1)))).toEqual({ ok: false, status: 413 });
  });

  it.each([undefined, "", "abc", "-1", "1e9"])("rejects a missing or invalid length %j", (length) => {
    expect(checkRequestSize(headers(length))).toEqual({ ok: false, status: 411 });
  });

  it("fits all photos at their maximum size", () => {
    expect(MAX_REQUEST_BYTES).toBeGreaterThan(4 * 1_500_000);
  });
});
