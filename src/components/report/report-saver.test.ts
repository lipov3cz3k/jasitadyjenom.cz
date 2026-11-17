import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyVehicleForm } from "../../lib/analysis/apply";
import { createReportSaver, type SaverStore } from "./report-saver";
import type { ReportSnapshot, StoredPhoto } from "./saved-report";

const snapshot = (description: string): ReportSnapshot => ({
  screen: "photos",
  photoIds: [],
  description,
  useAi: true,
  analysis: { kind: "off" },
  analyzedKey: null,
  place: { location: null, address: "", addressState: "idle", authority: null, authorityState: "idle" },
  takenAt: null,
  timeSource: null,
  vehicleForm: emptyVehicleForm,
  suggested: new Set(),
  driverPresent: false,
  draft: null,
  draftRequest: { kind: "idle" },
});

const photo = { id: "p1" } as StoredPhoto;

function recordingStore() {
  const log: string[] = [];
  const store: SaverStore = {
    saveSnapshot: async (s) => void log.push(`form:${s.description}`),
    savePhoto: async (p) => void log.push(`photo:${p.id}`),
    deletePhoto: async (id) => void log.push(`delete:${id}`),
  };
  return { log, store };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createReportSaver", () => {
  it("saves only the last form after a pause in changes", async () => {
    const { log, store } = recordingStore();
    const saver = createReportSaver(store, 400);
    saver.schedule(snapshot("a"));
    saver.schedule(snapshot("ab"));
    await vi.advanceTimersByTimeAsync(399);
    expect(log).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(log).toEqual(["form:ab"]);
  });

  it("writes a scheduled form right away on flush, once", async () => {
    const { log, store } = recordingStore();
    const saver = createReportSaver(store, 400);
    saver.schedule(snapshot("x"));
    saver.flush();
    await vi.advanceTimersByTimeAsync(1000);
    expect(log).toEqual(["form:x"]);
  });

  it("keeps photo writes in order with the form", async () => {
    const { log, store } = recordingStore();
    const saver = createReportSaver(store, 400);
    saver.savePhoto(photo);
    saver.schedule(snapshot("x"));
    saver.deletePhoto("p1");
    await vi.advanceTimersByTimeAsync(400);
    expect(log).toEqual(["photo:p1", "delete:p1", "form:x"]);
  });

  it("writes nothing after stop", async () => {
    const { log, store } = recordingStore();
    const saver = createReportSaver(store, 400);
    saver.schedule(snapshot("old"));
    await saver.stop();
    saver.flush();
    saver.schedule(snapshot("later"));
    saver.savePhoto(photo);
    await vi.advanceTimersByTimeAsync(1000);
    expect(log).toEqual([]);
  });

  it("keeps going after a failed write", async () => {
    const { log, store } = recordingStore();
    store.savePhoto = async () => {
      throw new DOMException("full", "QuotaExceededError");
    };
    const saver = createReportSaver(store, 400);
    saver.savePhoto(photo);
    saver.schedule(snapshot("x"));
    await vi.advanceTimersByTimeAsync(400);
    expect(log).toEqual(["form:x"]);
  });
});
