import { describe, expect, it } from "vitest";
import { storeSharedPhotos, takeSharedPhotos } from "./share-target";

// Minimal in-memory Cache Storage: Node has no `caches`
function memoryCaches(): CacheStorage {
  const stores = new Map<string, Map<string, Response>>();
  const cache = (entries: Map<string, Response>) =>
    ({
      async put(request: RequestInfo | URL, response: Response) {
        entries.set(new Request(request).url, response);
      },
      async match(request: RequestInfo | URL) {
        return entries.get(new Request(request).url)?.clone();
      },
      async keys() {
        return [...entries.keys()].map((url) => new Request(url));
      },
    }) as unknown as Cache;

  return {
    async has(name: string) {
      return stores.has(name);
    },
    async open(name: string) {
      if (!stores.has(name)) stores.set(name, new Map());
      return cache(stores.get(name)!);
    },
    async delete(name: string) {
      return stores.delete(name);
    },
  } as unknown as CacheStorage;
}

const photo = (name: string, body: string, lastModified: number) =>
  new File([body], name, { type: "image/jpeg", lastModified });

describe("shared photos", () => {
  it("come back in order with name, type, time and content", async () => {
    const storage = memoryCaches();
    const stored = await storeSharedPhotos(
      [photo("auto přes chodník.jpg", "first", 1_700_000_000_000), photo("2.jpg", "second", 1_700_000_060_000)],
      storage,
    );
    expect(stored).toBe(2);

    const files = await takeSharedPhotos(storage);
    expect(files.map((f) => f.name)).toEqual(["auto přes chodník.jpg", "2.jpg"]);
    expect(files.map((f) => f.type)).toEqual(["image/jpeg", "image/jpeg"]);
    expect(files.map((f) => f.lastModified)).toEqual([1_700_000_000_000, 1_700_000_060_000]);
    expect(await files[0].text()).toBe("first");
  });

  it("are taken only once", async () => {
    const storage = memoryCaches();
    await storeSharedPhotos([photo("a.jpg", "a", 1)], storage);
    expect(await takeSharedPhotos(storage)).toHaveLength(1);
    expect(await takeSharedPhotos(storage)).toEqual([]);
  });

  it("replace an earlier share that was never opened", async () => {
    const storage = memoryCaches();
    await storeSharedPhotos([photo("old.jpg", "old", 1)], storage);
    await storeSharedPhotos([photo("new.jpg", "new", 2)], storage);
    expect((await takeSharedPhotos(storage)).map((f) => f.name)).toEqual(["new.jpg"]);
  });

  it("store nothing for an empty share", async () => {
    const storage = memoryCaches();
    expect(await storeSharedPhotos([], storage)).toBe(0);
    expect(await takeSharedPhotos(storage)).toEqual([]);
  });
});
