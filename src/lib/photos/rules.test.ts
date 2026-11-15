import { describe, expect, it } from "vitest";
import {
  checkAttachments,
  evaluatePhotoAge,
  formatBytes,
  isImageFile,
  MAX_MESSAGE_BYTES,
  photoSpanMinutes,
} from "./rules";

describe("evaluatePhotoAge", () => {
  const now = new Date("2026-11-05T12:00:00Z");
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  it.each([
    [0, "ok"],
    [14, "ok"],
    [15, "old"],
    [365, "old"],
    [366, "expired"],
  ] as const)("%i dní → %s", (days, expected) => {
    expect(evaluatePhotoAge(daysAgo(days), now)).toBe(expected);
  });

  it("time in the future (with 1 h tolerance)", () => {
    expect(evaluatePhotoAge(new Date(now.getTime() + 30 * 60 * 1000), now)).toBe("ok");
    expect(evaluatePhotoAge(new Date(now.getTime() + 2 * 60 * 60 * 1000), now)).toBe("future");
  });
});

describe("checkAttachments", () => {
  it("v limitu", () => {
    expect(checkAttachments([5_000_000, 6_000_000])).toEqual({ totalBytes: 11_000_000, tooLarge: false, tooMany: false });
  });

  it("over 20 MB", () => {
    expect(checkAttachments([MAX_MESSAGE_BYTES, 1]).tooLarge).toBe(true);
  });

  it("over 50 attachments", () => {
    expect(checkAttachments(Array(51).fill(1)).tooMany).toBe(true);
  });
});

describe("formatBytes", () => {
  it("formats in Czech", () => {
    expect(formatBytes(500)).toBe("1 kB");
    expect(formatBytes(300 * 1024)).toBe("300 kB");
    expect(formatBytes(3.45 * 1024 * 1024)).toBe("3,5 MB");
  });
});

describe("photoSpanMinutes", () => {
  const at = (hms: string) => new Date(`2026-09-15T${hms}+02:00`);

  it("needs at least two times", () => {
    expect(photoSpanMinutes([])).toBeNull();
    expect(photoSpanMinutes([at("09:21:43")])).toBeNull();
  });

  it("ignores order", () => {
    expect(photoSpanMinutes([at("09:24:23"), at("09:21:43"), at("09:23:56")])).toBeCloseTo(2 + 40 / 60);
  });
});

describe("isImageFile", () => {
  it("accepts image MIME types and HEIC without MIME type", () => {
    expect(isImageFile({ name: "photo.jpg", type: "image/jpeg" })).toBe(true);
    expect(isImageFile({ name: "IMG_1234.HEIC", type: "" })).toBe(true);
    expect(isImageFile({ name: "notes.pdf", type: "application/pdf" })).toBe(false);
    expect(isImageFile({ name: "readme.txt", type: "text/plain" })).toBe(false);
  });
});
