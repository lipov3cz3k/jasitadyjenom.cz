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
