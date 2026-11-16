import { describe, expect, it } from "vitest";
import { installMode, isIos } from "./install";

describe("installMode", () => {
  it("offers nothing inside the installed app", () => {
    expect(installMode({ standalone: true, hasPrompt: true, ios: true })).toBe("none");
  });

  it("prefers the browser dialog, falls back to iOS steps", () => {
    expect(installMode({ standalone: false, hasPrompt: true, ios: false })).toBe("prompt");
    expect(installMode({ standalone: false, hasPrompt: false, ios: true })).toBe("ios");
    expect(installMode({ standalone: false, hasPrompt: false, ios: false })).toBe("none");
  });
});

describe("isIos", () => {
  it("recognizes iPhone and iPadOS posing as a Mac", () => {
    expect(isIos("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", 5)).toBe(true);
    expect(isIos("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5)).toBe(true);
    expect(isIos("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0)).toBe(false);
    expect(isIos("Mozilla/5.0 (Linux; Android 15)", 5)).toBe(false);
  });
});
