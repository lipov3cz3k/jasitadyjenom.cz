import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearReporter, loadReporter, saveReporter } from "./reporter-storage";

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reporter storage", () => {
  it("saves, loads and deletes", () => {
    const reporter = { fullName: "Jana Nováková", address: "Ruská 1, Praha", dataBoxId: "", email: "j@example.cz" };
    expect(loadReporter()).toBeNull();
    saveReporter(reporter);
    expect(loadReporter()).toEqual(reporter);
    clearReporter();
    expect(loadReporter()).toBeNull();
  });

  it("ignores corrupted data", () => {
    localStorage.setItem("jasitadyjenom.reporter.v1", "{nesmysl");
    expect(loadReporter()).toBeNull();
  });

  it("doesn't crash when storage is unavailable", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("SecurityError");
      },
      removeItem: () => {
        throw new Error("SecurityError");
      },
    });
    expect(loadReporter()).toBeNull();
    expect(() => saveReporter({ fullName: "A", address: "B" })).not.toThrow();
    expect(() => clearReporter()).not.toThrow();
  });
});
