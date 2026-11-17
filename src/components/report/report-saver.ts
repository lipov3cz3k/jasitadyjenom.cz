// Write queue for the report in progress: form changes are debounced, every write runs in order,
// and a stopped saver writes nothing more – so "Začít znovu" can't be undone by a late save.

import type { ReportSnapshot, StoredPhoto } from "./saved-report";

export interface SaverStore {
  saveSnapshot(snapshot: ReportSnapshot): Promise<void>;
  savePhoto(photo: StoredPhoto): Promise<void>;
  deletePhoto(id: string): Promise<void>;
}

export interface ReportSaver {
  /** Saves the form after a short pause in changes. */
  schedule(snapshot: ReportSnapshot): void;
  /** Writes a scheduled form now (the app is going to the background). */
  flush(): void;
  savePhoto(photo: StoredPhoto): void;
  deletePhoto(id: string): void;
  /** Drops anything not yet written and resolves once running writes are done. */
  stop(): Promise<void>;
}

export const SAVE_DELAY_MS = 400;

export function createReportSaver(store: SaverStore, delay = SAVE_DELAY_MS): ReportSaver {
  let pending: ReportSnapshot | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let chain = Promise.resolve();

  function enqueue(write: () => Promise<void>) {
    if (stopped) return;
    chain = chain
      .then(() => (stopped ? undefined : write()))
      .catch(() => {
        // Storage full or unavailable: the report still works, it just won't survive a close
      });
  }

  function flush() {
    clearTimeout(timer);
    const snapshot = pending;
    pending = null;
    if (snapshot) enqueue(() => store.saveSnapshot(snapshot));
  }

  return {
    schedule(snapshot) {
      if (stopped) return;
      pending = snapshot;
      clearTimeout(timer);
      timer = setTimeout(flush, delay);
    },
    flush,
    savePhoto: (photo) => enqueue(() => store.savePhoto(photo)),
    deletePhoto: (id) => enqueue(() => store.deletePhoto(id)),
    stop() {
      stopped = true;
      clearTimeout(timer);
      pending = null;
      return chain;
    },
  };
}
