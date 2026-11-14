import { detectEditing, type EditHint } from "./editing";

export interface LatLon {
  lat: number;
  lon: number;
}

export type TakenAtSource = "exif" | "file";

export interface PhotoMetadata {
  gps: LatLon | null;
  takenAt: Date | null;
  takenAtSource: TakenAtSource | null;
}

/** What `readPhotoMetadata` returns for a single photo. */
export interface PhotoInfo extends PhotoMetadata {
  /** Hint that the photo is not the camera original; `null` when nothing suggests editing. */
  edit: EditHint | null;
}

/**
 * EXIF date "YYYY:MM:DD HH:MM:SS". Without a time offset (OffsetTimeOriginal)
 * we treat the time as the device's local time – photos are taken where the browser is.
 */
export function parseExifDateTime(value?: string, offset?: string): Date | null {
  const m = value?.trim().match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m.map(Number);

  const off = offset?.trim().match(/^([+-])(\d{2}):?(\d{2})$/);
  const date = off
    ? new Date(
        Date.UTC(y, mo - 1, d, h, mi, s) -
          (off[1] === "-" ? -1 : 1) * (Number(off[2]) * 60 + Number(off[3])) * 60_000,
      )
    : new Date(y, mo - 1, d, h, mi, s);

  return Number.isNaN(date.getTime()) || y < 1990 ? null : date;
}

export function isValidGps(lat: unknown, lon: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180 &&
    !(lat === 0 && lon === 0)
  );
}

/**
 * Reads the location and capture time from a photo. The photo never leaves the browser.
 * Android (Chrome) and some iOS versions strip the location when picking a file –
 * so `gps: null` is a normal state, not an error.
 */
export async function readPhotoMetadata(file: File): Promise<PhotoInfo> {
  let gps: LatLon | null = null;
  let exifDate: Date | null = null;
  let edit: EditHint | null = null;

  try {
    const ExifReader = await import("exifreader");
    const tags = ExifReader.load(await file.arrayBuffer(), { expanded: true });
    const lat = tags.gps?.Latitude;
    const lon = tags.gps?.Longitude;
    if (isValidGps(lat, lon)) gps = { lat, lon: lon as number };
    exifDate = parseExifDateTime(
      tags.exif?.DateTimeOriginal?.description,
      tags.exif?.OffsetTimeOriginal?.description,
    );
    edit = detectEditing({
      software: tags.exif?.Software?.description,
      creatorTool: tags.xmp?.CreatorTool?.description,
      digitalSourceType: tags.xmp?.DigitalSourceType?.description,
      xmpRaw: tags.xmp?._raw,
      modifiedAt: parseExifDateTime(tags.exif?.DateTime?.description, tags.exif?.OffsetTime?.description),
      takenAt: exifDate,
    });
  } catch {
    // format without EXIF or a corrupted file – continue without metadata
  }

  if (exifDate) return { gps, takenAt: exifDate, takenAtSource: "exif", edit };
  if (file.lastModified) return { gps, takenAt: new Date(file.lastModified), takenAtSource: "file", edit };
  return { gps, takenAt: null, takenAtSource: null, edit };
}

/**
 * Picks the location (first photo that has one) and the time from several photos
 * (oldest EXIF time, otherwise the oldest file time).
 */
export function combineMetadata(items: PhotoMetadata[]): PhotoMetadata {
  const gps = items.find((m) => m.gps)?.gps ?? null;
  const earliest = (source: TakenAtSource) =>
    items
      .filter((m) => m.takenAtSource === source && m.takenAt)
      .map((m) => m.takenAt!)
      .sort((a, b) => a.getTime() - b.getTime())[0];

  const exif = earliest("exif");
  if (exif) return { gps, takenAt: exif, takenAtSource: "exif" };
  const file = earliest("file");
  if (file) return { gps, takenAt: file, takenAtSource: "file" };
  return { gps, takenAt: null, takenAtSource: null };
}
