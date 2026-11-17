// The report in progress in IndexedDB, so it survives closing the app – e.g. photos taken without
// signal, finished later. Stays in this browser; nothing here is sent anywhere.
//
// Photos are written once each (when added) and the rest of the form as one small record, so typing
// doesn't rewrite megabytes of photos. Every function rejects when IndexedDB is unavailable (some
// private modes); callers carry on without saving.

import { restoreReport, type ReportSnapshot, type RestoredReport, type StoredPhoto, toStoredState } from "./saved-report";

const DB_NAME = "jasitadyjenom-report";
const STATE = "state";
const PHOTOS = "photos";
const STATE_KEY = "current";

let opening: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STATE);
      request.result.createObjectStore(PHOTOS, { keyPath: "id" });
    };
    request.onsuccess = () => {
      const db = request.result;
      // Another tab upgrading the schema: let it, and reopen on the next call
      db.onversionchange = () => {
        db.close();
        opening = null;
      };
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB blocked"));
  }).catch((error: unknown) => {
    opening = null;
    throw error;
  });
  return opening;
}

/** Runs `work` in one transaction; resolves once it is committed. */
async function inTransaction<T>(
  stores: string[],
  mode: IDBTransactionMode,
  work: (tx: IDBTransaction) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    const request = work(tx);
    tx.oncomplete = () => resolve(request ? request.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

/** The saved report, or `null`. Drops an expired or unreadable one, and photos nothing refers to. */
export async function loadReport(now = Date.now()): Promise<RestoredReport | null> {
  let state: unknown;
  let photos: StoredPhoto[] = [];
  await inTransaction([STATE, PHOTOS], "readonly", (tx) => {
    tx.objectStore(STATE).get(STATE_KEY).onsuccess = (e) => {
      state = (e.target as IDBRequest).result;
    };
    tx.objectStore(PHOTOS).getAll().onsuccess = (e) => {
      photos = (e.target as IDBRequest<StoredPhoto[]>).result;
    };
  });

  const restored = restoreReport(state, photos, now);
  if (!restored) {
    if (state !== undefined || photos.length) await clearReport();
    return null;
  }
  const kept = new Set(restored.photos.map((p) => p.id));
  const orphans = photos.filter((p) => !kept.has(p.id)).map((p) => p.id);
  if (orphans.length) {
    await inTransaction([PHOTOS], "readwrite", (tx) => orphans.forEach((id) => tx.objectStore(PHOTOS).delete(id)));
  }
  return restored;
}

/** Stores the form; an empty one removes the saved report. */
export async function saveSnapshot(snapshot: ReportSnapshot, now = Date.now()): Promise<void> {
  const stored = toStoredState(snapshot, now);
  if (!stored) {
    await clearReport();
    return;
  }
  await inTransaction([STATE], "readwrite", (tx) => {
    tx.objectStore(STATE).put(stored, STATE_KEY);
  });
}

export async function savePhoto(photo: StoredPhoto): Promise<void> {
  await inTransaction([PHOTOS], "readwrite", (tx) => {
    tx.objectStore(PHOTOS).put(photo);
  });
}

export async function deletePhoto(id: string): Promise<void> {
  await inTransaction([PHOTOS], "readwrite", (tx) => {
    tx.objectStore(PHOTOS).delete(id);
  });
}

export async function clearReport(): Promise<void> {
  await inTransaction([STATE, PHOTOS], "readwrite", (tx) => {
    tx.objectStore(STATE).clear();
    tx.objectStore(PHOTOS).clear();
  });
}

let persistAsked = false;

/**
 * Asks the browser not to evict the saved photos under storage pressure. Chrome decides silently
 * (granted for installed apps), Firefox may ask the user once; asked at most once per page load.
 */
export function requestPersistentStorage(): void {
  if (persistAsked || !navigator.storage?.persist) return;
  persistAsked = true;
  void navigator.storage
    .persisted()
    .then((persisted) => (persisted ? true : navigator.storage.persist()))
    .catch(() => {
      // Best effort: without it the browser may clear the data when the device runs out of space
    });
}
