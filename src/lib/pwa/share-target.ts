// Photos shared to the installed app ("Share → jasitadyjenom" in the gallery).
//
// The OS POSTs them to SHARE_TARGET_PATH (see app/manifest.ts). The service worker (src/sw/sw.ts)
// catches that request, keeps the files in Cache Storage and redirects to the report page, which
// takes them from there. The photos never reach our server.

export const SHARE_TARGET_PATH = "/sdilet";
export const SHARE_TARGET_FIELD = "photos";
/** Query parameter of the redirect after the service worker stored shared photos. */
export const SHARED_PARAM = "sdileno";

const SHARE_CACHE = "jasitadyjenom-share";
const NAME_HEADER = "X-File-Name";
const MODIFIED_HEADER = "X-File-Last-Modified";

/** Service worker side: replaces any earlier unclaimed share. Returns how many files were stored. */
export async function storeSharedPhotos(files: File[], storage: CacheStorage = caches): Promise<number> {
  await storage.delete(SHARE_CACHE);
  if (files.length === 0) return 0;
  const cache = await storage.open(SHARE_CACHE);
  // One by one: cache keys keep insertion order, so the photos come back in the shared order
  for (const [i, file] of files.entries()) {
    await cache.put(
      new Request(new URL(`${SHARE_TARGET_PATH}/${i}`, "https://share.invalid")),
      new Response(file, {
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          [NAME_HEADER]: encodeURIComponent(file.name),
          [MODIFIED_HEADER]: String(file.lastModified),
        },
      }),
    );
  }
  return files.length;
}

/** Page side: reads the shared photos and removes them, so they are taken only once. */
export async function takeSharedPhotos(storage: CacheStorage = caches): Promise<File[]> {
  if (!(await storage.has(SHARE_CACHE))) return [];
  const cache = await storage.open(SHARE_CACHE);
  const files: File[] = [];

  for (const request of await cache.keys()) {
    const response = await cache.match(request);
    if (!response) continue;
    const blob = await response.blob();
    const name = decodeURIComponent(response.headers.get(NAME_HEADER) ?? "") || "sdilena-fotka.jpg";
    // The file time is only a fallback for photos without EXIF; keep the original when the OS passed it
    const lastModified = Number(response.headers.get(MODIFIED_HEADER)) || Date.now();
    files.push(new File([blob], name, { type: blob.type, lastModified }));
  }

  await storage.delete(SHARE_CACHE);
  return files;
}
