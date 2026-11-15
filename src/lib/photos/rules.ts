// Rules for photos as notice attachments.

/** The authority must notify the vehicle operator "without undue delay" and may shelve the case after 60 days. */
export const OLD_AFTER_DAYS = 14;
/** The offence becomes time-barred after 1 year (§ 30 of Act No. 250/2016 Coll.). */
export const EXPIRED_AFTER_DAYS = 365;

/** Data box message: max. 20 MB including attachments and at most 50 attachments. */
export const MAX_MESSAGE_BYTES = 20 * 1024 * 1024;
export const MAX_ATTACHMENTS = 50;

const DAY_MS = 24 * 60 * 60 * 1000;

export type PhotoAge = "ok" | "old" | "expired" | "future";

export function evaluatePhotoAge(takenAt: Date, now: Date = new Date()): PhotoAge {
  const age = now.getTime() - takenAt.getTime();
  // one hour of slack for device clock drift
  if (age < -60 * 60 * 1000) return "future";
  if (age > EXPIRED_AFTER_DAYS * DAY_MS) return "expired";
  if (age > OLD_AFTER_DAYS * DAY_MS) return "old";
  return "ok";
}

export interface AttachmentCheck {
  totalBytes: number;
  tooLarge: boolean;
  tooMany: boolean;
}

export function checkAttachments(sizes: number[]): AttachmentCheck {
  const totalBytes = sizes.reduce((sum, s) => sum + s, 0);
  return {
    totalBytes,
    tooLarge: totalBytes > MAX_MESSAGE_BYTES,
    tooMany: sizes.length > MAX_ATTACHMENTS,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} kB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} MB`;
}

/**
 * Parking (unlike stopping) means staying longer than needed to get in/out or load (§ 2 Act No. 361/2000 Coll.).
 * The law sets no minimum; a few minutes between the first and last photo is our rule of thumb.
 */
export const MIN_PARKING_SPAN_MINUTES = 5;

/** Minutes between the earliest and the latest capture time; `null` with fewer than two times. */
export function photoSpanMinutes(times: Date[]): number | null {
  if (times.length < 2) return null;
  const ms = times.map((t) => t.getTime());
  return (Math.max(...ms) - Math.min(...ms)) / 60_000;
}

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|avif|heic|heif|bmp|tiff?)$/i;

/** Accepts `image/*` MIME types and known photo extensions (browsers often leave `type` empty for HEIC). */
export function isImageFile(file: Pick<File, "name" | "type">): boolean {
  return file.type.startsWith("image/") || IMAGE_EXTENSIONS.test(file.name);
}
