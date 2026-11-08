// Re-encodes a photo for the AI request. Drawing to a canvas drops all metadata (GPS, device),
// and a smaller image is cheaper and faster to send while the plate stays readable.

export const MAX_EDGE = 1600;
// A detailed photo at the first quality can exceed the server limit; the second one practically never does
const QUALITIES = [0.85, 0.7];

/** Size that fits into `maxEdge` while keeping the aspect ratio; never upscales. */
export function fitWithin(width: number, height: number, maxEdge = MAX_EDGE): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * JPEG without metadata, or `null` when the browser can't decode the file (e.g. HEIC outside Safari)
 * or the result doesn't fit into `maxBytes`.
 */
export async function downscaleForAnalysis(file: File, maxBytes: number): Promise<Blob | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);
    for (const quality of QUALITIES) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= maxBytes) return blob;
    }
    return null;
  } finally {
    bitmap.close();
  }
}
