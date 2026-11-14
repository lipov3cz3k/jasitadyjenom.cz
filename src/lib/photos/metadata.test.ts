import { describe, expect, it } from "vitest";
import { combineMetadata, parseExifDateTime, readPhotoMetadata, type PhotoMetadata } from "./metadata";

/**
 * Minimal JPEG with EXIF: DateTimeOriginal, OffsetTimeOriginal and GPS
 * (50°5'15" N, 14°25'16.68" E = Old Town Square, Prague).
 */
function jpegWithExif(): Uint8Array<ArrayBuffer> {
  const tiff = new DataView(new ArrayBuffer(198));
  const ascii = (offset: number, text: string) =>
    [...text].forEach((ch, i) => tiff.setUint8(offset + i, ch.charCodeAt(0)));
  const entry = (at: number, tag: number, type: number, count: number, value: number) => {
    tiff.setUint16(at, tag, true);
    tiff.setUint16(at + 2, type, true);
    tiff.setUint32(at + 4, count, true);
    tiff.setUint32(at + 8, value, true);
  };
  const rationals = (at: number, values: [number, number][]) =>
    values.forEach(([n, d], i) => {
      tiff.setUint32(at + i * 8, n, true);
      tiff.setUint32(at + i * 8 + 4, d, true);
    });
  const ASCII = 2, LONG = 4, RATIONAL = 5;

  ascii(0, "II");
  tiff.setUint16(2, 42, true);
  tiff.setUint32(4, 8, true);
  // IFD0: pointers to the Exif IFD (38) and GPS IFD (96)
  tiff.setUint16(8, 2, true);
  entry(10, 0x8769, LONG, 1, 38);
  entry(22, 0x8825, LONG, 1, 96);
  // Exif IFD
  tiff.setUint16(38, 2, true);
  entry(40, 0x9003, ASCII, 20, 68);
  entry(52, 0x9011, ASCII, 7, 88);
  ascii(68, "2026:11:03 14:30:00\0");
  ascii(88, "+01:00\0");
  // GPS IFD
  tiff.setUint16(96, 4, true);
  entry(98, 0x0001, ASCII, 2, "N".charCodeAt(0));
  entry(110, 0x0002, RATIONAL, 3, 150);
  entry(122, 0x0003, ASCII, 2, "E".charCodeAt(0));
  entry(134, 0x0004, RATIONAL, 3, 174);
  rationals(150, [[50, 1], [5, 1], [15, 1]]);
  rationals(174, [[14, 1], [25, 1], [1668, 100]]);

  const header = [..."Exif\0\0"].map((c) => c.charCodeAt(0));
  const app1Length = 2 + header.length + tiff.byteLength;
  return new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe1, app1Length >> 8, app1Length & 0xff,
    ...header,
    ...new Uint8Array(tiff.buffer),
    0xff, 0xd9,
  ]);
}

describe("parseExifDateTime", () => {
  it("with an offset converts to UTC", () => {
    expect(parseExifDateTime("2026:11:03 14:30:00", "+01:00")?.toISOString()).toBe("2026-11-03T13:30:00.000Z");
    expect(parseExifDateTime("2026:07:01 08:00:00", "-04:00")?.toISOString()).toBe("2026-07-01T12:00:00.000Z");
  });

  it("without an offset uses local time", () => {
    const d = parseExifDateTime("2026:11:03 14:30:00");
    expect([d?.getFullYear(), d?.getMonth(), d?.getDate(), d?.getHours(), d?.getMinutes()]).toEqual([2026, 10, 3, 14, 30]);
  });

  it.each([undefined, "", "0000:00:00 00:00:00", "nesmysl", "1970:01:01 00:00:00"])(
    "neplatná hodnota %j → null",
    (value) => {
      expect(parseExifDateTime(value)).toBeNull();
    },
  );
});

describe("readPhotoMetadata", () => {
  it("reads GPS and time from EXIF", async () => {
    const file = new File([jpegWithExif()], "foto.jpg", { type: "image/jpeg", lastModified: 0 });
    const meta = await readPhotoMetadata(file);

    expect(meta.gps?.lat).toBeCloseTo(50.0875, 5);
    expect(meta.gps?.lon).toBeCloseTo(14.4213, 5);
    expect(meta.takenAtSource).toBe("exif");
    expect(meta.takenAt?.toISOString()).toBe("2026-11-03T13:30:00.000Z");
  });

  it("without EXIF uses the file time and returns no location", async () => {
    const lastModified = Date.UTC(2026, 10, 4, 9, 0);
    const file = new File([new Uint8Array([1, 2, 3])], "x.jpg", { type: "image/jpeg", lastModified });
    expect(await readPhotoMetadata(file)).toEqual({
      gps: null,
      takenAt: new Date(lastModified),
      takenAtSource: "file",
    });
  });
});

describe("combineMetadata", () => {
  const at = (iso: string) => new Date(iso);

  it("takes the location from the first photo that has one and the oldest EXIF time", () => {
    const items: PhotoMetadata[] = [
      { gps: null, takenAt: at("2026-11-03T10:05:00Z"), takenAtSource: "exif" },
      { gps: { lat: 50, lon: 14 }, takenAt: at("2026-11-03T10:00:00Z"), takenAtSource: "exif" },
      { gps: { lat: 49, lon: 16 }, takenAt: at("2026-11-01T00:00:00Z"), takenAtSource: "file" },
    ];
    expect(combineMetadata(items)).toEqual({
      gps: { lat: 50, lon: 14 },
      takenAt: at("2026-11-03T10:00:00Z"),
      takenAtSource: "exif",
    });
  });

  it("without EXIF time uses the oldest file time", () => {
    const items: PhotoMetadata[] = [
      { gps: null, takenAt: at("2026-11-03T10:00:00Z"), takenAtSource: "file" },
      { gps: null, takenAt: at("2026-11-02T10:00:00Z"), takenAtSource: "file" },
    ];
    expect(combineMetadata(items).takenAt).toEqual(at("2026-11-02T10:00:00Z"));
  });

  it("empty list", () => {
    expect(combineMetadata([])).toEqual({ gps: null, takenAt: null, takenAtSource: null });
  });
});
