// A report in progress, kept in this browser so it survives closing the app (see report-store.ts).
//
// Pure mapping between the flow's state and what is stored. Requests that were running when the app
// closed can't resume, so they come back as something the user can retry. Reporter details are not
// part of it: they are stored only when the user ticks "Zapamatovat v tomto prohlížeči".

import type { VehicleField, VehicleForm } from "@/lib/analysis/apply";
import type { EditHint } from "@/lib/photos/editing";
import type { PhotoMetadata } from "@/lib/photos/metadata";
import type { DraftState } from "./DraftEditor";
import type { AnalysisState, DraftRequest, PlaceState, TimeSource } from "./ReportFlow";

export type ReportScreen = "photos" | "review" | "notice";

/** A saved report older than this is dropped: the photos are no longer fresh evidence. */
export const SAVED_REPORT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

const VERSION = 1;

export const INTERRUPTED_ANALYSIS =
  "Rozpoznání se přerušilo, když se aplikace zavřela. Zkuste to znovu, nebo údaje vyplňte ručně.";
export const INTERRUPTED_DRAFT =
  "Text na míru se nedopsal, když se aplikace zavřela, použili jsme základní text.";

/** The flow's state, as ReportFlow holds it. */
export interface ReportSnapshot {
  screen: ReportScreen;
  photoIds: string[];
  description: string;
  useAi: boolean;
  analysis: AnalysisState;
  /** Inputs of the last successful analysis (see ReportFlow). */
  analyzedKey: string | null;
  place: PlaceState;
  takenAt: Date | null;
  timeSource: TimeSource | null;
  vehicleForm: VehicleForm;
  suggested: ReadonlySet<VehicleField>;
  driverPresent: boolean;
  draft: DraftState | null;
  draftRequest: DraftRequest;
}

/** The stored record; photos are stored separately, one record each. */
export interface StoredState extends Omit<ReportSnapshot, "suggested"> {
  version: number;
  savedAt: number;
  suggested: VehicleField[];
}

/** One stored photo. The blob is kept apart from the name: Safari has been unreliable with stored Files. */
export interface StoredPhoto {
  id: string;
  blob: Blob;
  name: string;
  type: string;
  lastModified: number;
  takenAt: Date | null;
  edit: EditHint | null;
  metadata: PhotoMetadata;
}

export interface RestoredPhoto {
  id: string;
  file: File;
  takenAt: Date | null;
  edit: EditHint | null;
  metadata: PhotoMetadata;
}

export interface RestoredReport {
  savedAt: Date;
  snapshot: ReportSnapshot;
  photos: RestoredPhoto[];
  /** The address or authority lookup was still running: look the place up again. */
  relookup: boolean;
}

/** Nothing the user would miss: no photos, no description, no place, no filled-in field. */
export function isEmptySnapshot(s: ReportSnapshot): boolean {
  return (
    s.photoIds.length === 0 &&
    !s.description.trim() &&
    !s.place.location &&
    !s.place.address.trim() &&
    s.timeSource !== "manual" &&
    Object.values(s.vehicleForm).every((v) => !v.trim())
  );
}

/** What to store for the current state; `null` means there is nothing worth keeping. */
export function toStoredState(s: ReportSnapshot, now: number): StoredState | null {
  if (isEmptySnapshot(s)) return null;
  return { ...s, version: VERSION, savedAt: now, suggested: [...s.suggested] };
}

/**
 * Rebuilds the flow's state from what was stored. Returns `null` for a missing, unknown or expired
 * record; the caller then clears the store.
 */
export function restoreReport(state: unknown, photos: StoredPhoto[], now: number): RestoredReport | null {
  if (!isStoredState(state) || now - state.savedAt > SAVED_REPORT_MAX_AGE_MS) return null;

  const byId = new Map(photos.map((p) => [p.id, p]));
  const restored = state.photoIds.flatMap((id) => {
    const p = byId.get(id);
    if (!p) return [];
    const file = new File([p.blob], p.name, { type: p.type, lastModified: p.lastModified });
    return [{ id, file, takenAt: p.takenAt, edit: p.edit, metadata: p.metadata }];
  });

  // `rest` still carries `version`; harmless, toStoredState overwrites it on the next save
  const { savedAt, suggested, ...rest } = state;
  const lookupRunning = rest.place.addressState === "loading" || rest.place.authorityState === "loading";

  const snapshot: ReportSnapshot = {
    ...rest,
    // A photo whose record didn't make it (closed mid-save) is left out rather than shown broken
    photoIds: restored.map((p) => p.id),
    suggested: new Set(suggested),
    analysis: rest.analysis.kind === "loading" ? { kind: "error", message: INTERRUPTED_ANALYSIS } : rest.analysis,
    draftRequest: rest.draftRequest.kind === "loading" ? { kind: "error", message: INTERRUPTED_DRAFT } : rest.draftRequest,
  };

  return { savedAt: new Date(savedAt), snapshot, photos: restored, relookup: lookupRunning && !!rest.place.location };
}

function isStoredState(value: unknown): value is StoredState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<StoredState>;
  return v.version === VERSION && typeof v.savedAt === "number" && Array.isArray(v.photoIds);
}
