import { describe, expect, it } from "vitest";
import { emptyVehicleForm } from "../../lib/analysis/apply";
import {
  INTERRUPTED_ANALYSIS,
  INTERRUPTED_DRAFT,
  isEmptySnapshot,
  restoreReport,
  SAVED_REPORT_MAX_AGE_MS,
  toStoredState,
  type ReportSnapshot,
  type StoredPhoto,
} from "./saved-report";

const NOW = Date.UTC(2026, 10, 16, 12);

const empty: ReportSnapshot = {
  screen: "photos",
  photoIds: [],
  description: "",
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
};

const located = { point: { lat: 50.08, lon: 14.42 }, source: "exif" as const };

function photo(id: string, name = `${id}.jpg`): StoredPhoto {
  return {
    id,
    blob: new Blob(["jpeg"], { type: "image/jpeg" }),
    name,
    type: "image/jpeg",
    lastModified: 1_700_000_000_000,
    takenAt: new Date(NOW - 60_000),
    edit: null,
    metadata: { gps: located.point, takenAt: new Date(NOW - 60_000), takenAtSource: "exif" },
  };
}

describe("isEmptySnapshot", () => {
  it("treats the untouched form as empty", () => {
    expect(isEmptySnapshot(empty)).toBe(true);
    expect(toStoredState(empty, NOW)).toBeNull();
  });

  it("keeps anything the user put in", () => {
    expect(isEmptySnapshot({ ...empty, photoIds: ["a"] })).toBe(false);
    expect(isEmptySnapshot({ ...empty, description: "na chodníku" })).toBe(false);
    expect(isEmptySnapshot({ ...empty, vehicleForm: { ...emptyVehicleForm, plate: "1AB 2345" } })).toBe(false);
    expect(isEmptySnapshot({ ...empty, timeSource: "manual", takenAt: new Date(NOW) })).toBe(false);
    expect(isEmptySnapshot({ ...empty, place: { ...empty.place, location: located } })).toBe(false);
  });

  it("ignores whitespace", () => {
    expect(isEmptySnapshot({ ...empty, description: "  \n" })).toBe(true);
  });
});

describe("restoreReport", () => {
  const filled: ReportSnapshot = {
    ...empty,
    screen: "review",
    photoIds: ["b", "a"],
    description: "Stojí na přechodu",
    suggested: new Set(["plate"]),
  };

  it("round-trips the form and rebuilds the photos in order", () => {
    const stored = toStoredState(filled, NOW)!;
    const restored = restoreReport(stored, [photo("a"), photo("b", "druha.jpg")], NOW + 1000)!;

    expect(restored.savedAt).toEqual(new Date(NOW));
    expect(restored.snapshot.screen).toBe("review");
    expect(restored.snapshot.description).toBe("Stojí na přechodu");
    expect(restored.snapshot.suggested).toEqual(new Set(["plate"]));
    expect(restored.photos.map((p) => p.id)).toEqual(["b", "a"]);
    expect(restored.photos[0].file).toBeInstanceOf(File);
    expect(restored.photos[0].file.name).toBe("druha.jpg");
    expect(restored.photos[0].file.type).toBe("image/jpeg");
    expect(restored.relookup).toBe(false);
  });

  it("leaves out photos whose record is missing", () => {
    const restored = restoreReport(toStoredState(filled, NOW), [photo("a")], NOW)!;
    expect(restored.photos.map((p) => p.id)).toEqual(["a"]);
    expect(restored.snapshot.photoIds).toEqual(["a"]);
  });

  it("turns requests cut off by closing into retryable errors", () => {
    const stored = toStoredState(
      { ...filled, analysis: { kind: "loading" }, draftRequest: { kind: "loading" } },
      NOW,
    );
    const { snapshot } = restoreReport(stored, [], NOW)!;
    expect(snapshot.analysis).toEqual({ kind: "error", message: INTERRUPTED_ANALYSIS });
    expect(snapshot.draftRequest).toEqual({ kind: "error", message: INTERRUPTED_DRAFT });
  });

  it("asks for a new place lookup when one was running", () => {
    const place = { ...empty.place, location: located, addressState: "loading" as const, authorityState: "loading" as const };
    expect(restoreReport(toStoredState({ ...filled, place }, NOW), [], NOW)!.relookup).toBe(true);
    // Without a location there is nothing to look up
    const noPoint = { ...empty.place, address: "Praha", addressState: "loading" as const };
    expect(restoreReport(toStoredState({ ...filled, place: noPoint }, NOW), [], NOW)!.relookup).toBe(false);
  });

  it("drops an expired report", () => {
    const stored = toStoredState(filled, NOW);
    expect(restoreReport(stored, [], NOW + SAVED_REPORT_MAX_AGE_MS - 1)).not.toBeNull();
    expect(restoreReport(stored, [], NOW + SAVED_REPORT_MAX_AGE_MS + 1)).toBeNull();
  });

  it("rejects missing or unknown records", () => {
    expect(restoreReport(undefined, [], NOW)).toBeNull();
    expect(restoreReport({ version: 99, savedAt: NOW, photoIds: [] }, [], NOW)).toBeNull();
    expect(restoreReport("garbage", [], NOW)).toBeNull();
  });
});
