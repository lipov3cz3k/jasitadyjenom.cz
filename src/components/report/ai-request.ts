// Browser side of the AI endpoints: downscaled photos in a form, errors as user-facing text.

import { MAX_PHOTO_BYTES, MAX_PHOTOS } from "@/lib/analysis/schema";
import { downscaleForAnalysis } from "@/lib/photos/downscale";
import type { PhotoItem } from "./PhotoPicker";

/** Appends up to MAX_PHOTOS downscaled JPEGs without metadata; returns the photos that were sent, in order. */
export async function appendPhotos(form: FormData, photos: PhotoItem[]): Promise<PhotoItem[]> {
  const sent: PhotoItem[] = [];
  for (const photo of photos) {
    if (sent.length === MAX_PHOTOS) break;
    const jpeg = await downscaleForAnalysis(photo.file, MAX_PHOTO_BYTES);
    if (!jpeg) continue;
    sent.push(photo);
    form.append("photo", jpeg, `foto-${sent.length}.jpg`);
  }
  return sent;
}

export type AiResult<T> = { ok: true; data: T } | { ok: false; message: string } | { ok: false; aborted: true };

export async function postAi<T>(url: string, form: FormData, signal: AbortSignal, fallback: string): Promise<AiResult<T>> {
  try {
    const response = await fetch(url, { method: "POST", body: form, signal });
    const body: unknown = await response.json().catch(() => null);
    if (signal.aborted) return { ok: false, aborted: true };
    if (response.ok) return { ok: true, data: body as T };
    const message =
      body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : fallback;
    return { ok: false, message };
  } catch {
    if (signal.aborted) return { ok: false, aborted: true };
    return { ok: false, message: `${fallback} Zkontrolujte připojení.` };
  }
}
