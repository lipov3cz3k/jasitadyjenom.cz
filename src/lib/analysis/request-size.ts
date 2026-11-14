import { MAX_PHOTO_BYTES, MAX_PHOTOS } from "./schema";

/** All photos at their maximum size plus room for the text fields and multipart overhead. */
export const MAX_REQUEST_BYTES = MAX_PHOTOS * MAX_PHOTO_BYTES + 64 * 1024;

export type SizeCheck = { ok: true } | { ok: false; status: 411 | 413 };

/**
 * Decides from the Content-Length header before the body is read, so an oversized request
 * never gets buffered in memory. Browsers always send the header for a FormData body.
 */
export function checkRequestSize(headers: Headers, max = MAX_REQUEST_BYTES): SizeCheck {
  const raw = headers.get("content-length");
  if (raw === null || !/^\d+$/.test(raw.trim())) return { ok: false, status: 411 };
  return Number(raw) > max ? { ok: false, status: 413 } : { ok: true };
}
