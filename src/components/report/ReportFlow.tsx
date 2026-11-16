"use client";

// Three screens: photos (+ optional description) → review of the pre-filled data → the notice.
// Rendered in the browser only (see ReportFlowClient): reads saved reporter details from localStorage.

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  applyAnalysis,
  emptyVehicleForm,
  vehicleFieldLabels,
  type VehicleField,
  type VehicleForm,
} from "@/lib/analysis/apply";
import type { Analysis } from "@/lib/analysis/schema";
import { loadAuthorityIndex, resolveAuthority, type ResolvedAuthority } from "@/lib/authority/client";
import { reverseGeocode } from "@/lib/cuzk";
import type { DraftFacts, NoticeDraft } from "@/lib/draft/schema";
import { clearReporter, loadReporter, saveReporter } from "@/lib/notice/reporter-storage";
import type { Reporter } from "@/lib/notice/template";
import { combineMetadata, readPhotoMetadata, type LatLon, type PhotoMetadata } from "@/lib/photos/metadata";
import { isImageFile } from "@/lib/photos/rules";
import { SHARED_PARAM, takeSharedPhotos } from "@/lib/pwa/share-target";
import { appendPhotos, postAi } from "./ai-request";
import { draftKey, type DraftState } from "./DraftEditor";
import { NoticeScreen } from "./NoticeScreen";
import { PhotosScreen } from "./PhotosScreen";
import type { PhotoItem } from "./PhotoPicker";
import { ReviewScreen } from "./ReviewScreen";

export type LocationSource = "exif" | "device" | "map";
export type TimeSource = "exif" | "file" | "manual";

export interface Located {
  point: LatLon;
  source: LocationSource;
}

export type AnalysisState =
  | { kind: "off" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; analysis: Analysis; filled: string[]; skipped: number };

export type DraftRequest = { kind: "idle" | "loading" } | { kind: "error"; message: string };

export interface PlaceState {
  location: Located | null;
  address: string;
  addressState: "idle" | "loading" | "missing";
  authority: ResolvedAuthority | null;
  authorityState: "idle" | "loading" | "error";
}

export interface ReporterState {
  reporter: Reporter;
  anonymous: boolean;
  remember: boolean;
  /** Details were loaded from this browser. */
  stored: boolean;
}

const emptyReporter: Reporter = { fullName: "", address: "", dataBoxId: "", email: "" };

type Screen = "photos" | "review" | "notice";

export default function ReportFlow() {
  const [screen, setScreen] = useState<Screen>("photos");

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const metadata = useRef(new Map<string, PhotoMetadata>());
  const photoUrls = useRef<string[]>([]);

  const [description, setDescription] = useState("");
  const [useAi, setUseAi] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisState>({ kind: "off" });
  /** Inputs of the last successful analysis; going back and forth doesn't repeat the same request. */
  const analyzedKey = useRef<string | null>(null);

  const [place, setPlace] = useState<PlaceState>({
    location: null,
    address: "",
    addressState: "idle",
    authority: null,
    authorityState: "idle",
  });
  const lookup = useRef<AbortController | null>(null);

  const [takenAt, setTakenAt] = useState<Date | null>(null);
  const [timeSource, setTimeSource] = useState<TimeSource | null>(null);

  const [vehicleForm, setVehicleForm] = useState<VehicleForm>(emptyVehicleForm);
  const [suggested, setSuggested] = useState<ReadonlySet<VehicleField>>(new Set());
  const [driverPresent, setDriverPresent] = useState(false);

  const [reporterState, setReporterState] = useState<ReporterState>(() => {
    const stored = loadReporter();
    return { reporter: stored ?? emptyReporter, anonymous: false, remember: stored !== null, stored: stored !== null };
  });

  const [draft, setDraft] = useState<DraftState | null>(null);
  const [draftRequest, setDraftRequest] = useState<DraftRequest>({ kind: "idle" });
  const aiRequest = useRef<AbortController | null>(null);
  const draftAbort = useRef<AbortController | null>(null);

  // AI answers take seconds; they must merge into the form as it is then, not as it was on click
  const latest = useRef({ vehicleForm, suggested });
  useEffect(() => {
    latest.current = { vehicleForm, suggested };
  });

  useEffect(() => {
    const urls = photoUrls.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen]);

  // Photos shared to the installed app wait in the browser cache (see lib/pwa/share-target.ts)
  const addSharedPhotos = useEffectEvent((files: File[]) => {
    const images = files.filter(isImageFile);
    if (images.length) void addPhotos(images);
  });
  const sharedTaken = useRef(false);
  useEffect(() => {
    if (sharedTaken.current) return;
    sharedTaken.current = true;
    const url = new URL(window.location.href);
    if (!url.searchParams.has(SHARED_PARAM)) return;
    url.searchParams.delete(SHARED_PARAM);
    // A reload must not ask for the (already taken) photos again
    window.history.replaceState(window.history.state, "", url);
    takeSharedPhotos()
      .then(addSharedPhotos)
      .catch(() => {
        // Cache Storage unavailable – the user picks the photos by hand
      });
  }, []);

  function updateLocation(point: LatLon, source: LocationSource) {
    lookup.current?.abort();
    const controller = new AbortController();
    lookup.current = controller;
    const { signal } = controller;

    // The old address would be misleading for a new place – clear it until the new one arrives
    setPlace((p) => ({
      ...p,
      location: { point, source },
      address: "",
      addressState: "loading",
      authority: null,
      authorityState: "loading",
    }));

    reverseGeocode(point, signal)
      .then((found) => {
        if (!signal.aborted) setPlace((p) => ({ ...p, address: found ?? "", addressState: found ? "idle" : "missing" }));
      })
      .catch(() => {
        if (!signal.aborted) setPlace((p) => ({ ...p, address: "", addressState: "missing" }));
      });

    loadAuthorityIndex()
      .then((index) => resolveAuthority(index, point, signal))
      .then((result) => {
        if (!signal.aborted) setPlace((p) => ({ ...p, authority: result, authorityState: "idle" }));
      })
      .catch(() => {
        if (!signal.aborted) setPlace((p) => ({ ...p, authorityState: "error" }));
      });
  }

  async function addPhotos(files: File[]) {
    const items = files.map((file) => {
      const url = URL.createObjectURL(file);
      photoUrls.current.push(url);
      return { id: crypto.randomUUID(), file, url };
    });
    setPhotos((prev) => [...prev, ...items]);

    const read = await Promise.all(items.map((i) => readPhotoMetadata(i.file)));
    items.forEach((item, n) => metadata.current.set(item.id, read[n]));
    // Only an EXIF time can be checked by the authority; the file time changes on copying
    const results = new Map(
      items.map((item, n) => [
        item.id,
        { takenAt: read[n].takenAtSource === "exif" ? read[n].takenAt : null, edit: read[n].edit },
      ]),
    );
    setPhotos((prev) => prev.map((p) => (results.has(p.id) ? { ...p, ...results.get(p.id) } : p)));

    const combined = combineMetadata([...metadata.current.values()]);
    // A photo never overrides the user's manual choice
    if (combined.gps && (!place.location || place.location.source === "exif")) updateLocation(combined.gps, "exif");
    if (combined.takenAt && timeSource !== "manual") {
      setTakenAt(combined.takenAt);
      setTimeSource(combined.takenAtSource);
    }
  }

  function removePhoto(id: string) {
    metadata.current.delete(id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  function changeVehicleField<K extends VehicleField>(field: K, value: VehicleForm[K]) {
    setVehicleForm((f) => ({ ...f, [field]: value }));
    // Once edited, the value is the user's and a new AI run won't touch it
    setSuggested((s) => {
      if (!s.has(field)) return s;
      const next = new Set(s);
      next.delete(field);
      return next;
    });
  }

  const analysisKey = () => JSON.stringify([description.trim(), photos.map((p) => p.id)]);

  async function analyze() {
    const key = analysisKey();
    aiRequest.current?.abort();
    const controller = new AbortController();
    aiRequest.current = controller;
    setAnalysis({ kind: "loading" });

    const form = new FormData();
    form.set("description", description.trim());
    const sent = await appendPhotos(form, photos);
    if (sent.length === 0 && !description.trim()) {
      setAnalysis({
        kind: "error",
        message: "Fotky se nepodařilo zpracovat (např. formát HEIC). Vyplňte prosím údaje ručně.",
      });
      return;
    }

    const result = await postAi<Analysis>(
      "/api/analyze",
      form,
      controller.signal,
      "Rozpoznání se nepovedlo. Vyplňte prosím údaje ručně.",
    );
    if ("aborted" in result) return;
    if (!result.ok) {
      setAnalysis({ kind: "error", message: result.message });
      return;
    }

    const applied = applyAnalysis(latest.current.vehicleForm, latest.current.suggested, result.data);
    setVehicleForm(applied.form);
    setSuggested(applied.suggested);
    if (result.data.placeHint && !place.location) {
      // Without a location the address field is empty; the place read from the photos is a good start
      setPlace((p) => (p.address.trim() ? p : { ...p, address: result.data.placeHint! }));
    }
    analyzedKey.current = key;
    setAnalysis({
      kind: "done",
      analysis: result.data,
      filled: applied.changed.map((f) => vehicleFieldLabels[f]),
      skipped: photos.length - sent.length,
    });
  }

  function draftFacts(): DraftFacts | null {
    const { offense, vehicle, details } = vehicleForm;
    if (!offense) return null;
    return { offense, vehicle: vehicle.trim(), details: details.trim(), description: description.trim() };
  }

  async function writeDraft() {
    const facts = draftFacts();
    if (!facts) return;
    draftAbort.current?.abort();
    const controller = new AbortController();
    draftAbort.current = controller;
    setDraftRequest({ kind: "loading" });

    const form = new FormData();
    form.set("facts", JSON.stringify(facts));
    const sent = await appendPhotos(form, photos);
    const result = await postAi<NoticeDraft>(
      "/api/draft",
      form,
      controller.signal,
      "Text na míru se nepodařilo napsat, použili jsme základní text.",
    );
    if ("aborted" in result) return;
    if (!result.ok) {
      setDraftRequest({ kind: "error", message: result.message });
      return;
    }
    const { data } = result;
    setDraft({
      key: draftKey(facts, photos),
      facts: data.facts,
      harm: data.harm.map((h) => `${h.title}: ${h.text}`).join("\n"),
      captions: Object.fromEntries(
        data.captions.flatMap((c) => (sent[c.photo - 1] ? [[sent[c.photo - 1].id, c.caption]] : [])),
      ),
      warnings: data.warnings,
    });
    setDraftRequest({ kind: "idle" });
  }

  function continueToReview() {
    if (!useAi) setAnalysis({ kind: "off" });
    else if (analysis.kind !== "done" || analyzedKey.current !== analysisKey()) void analyze();
    setScreen("review");
  }

  function continueToNotice() {
    const { reporter, anonymous, remember } = reporterState;
    if (!anonymous) {
      if (remember) saveReporter(reporter);
      else clearReporter();
    }
    const facts = draftFacts();
    // Write a fresh text when the AI is on and the current one was written from different inputs
    if (useAi && facts && draft?.key !== draftKey(facts, photos)) void writeDraft();
    setScreen("notice");
  }

  if (screen === "photos") {
    return (
      <PhotosScreen
        photos={photos}
        onAdd={addPhotos}
        onRemove={removePhoto}
        description={description}
        onDescriptionChange={setDescription}
        useAi={useAi}
        onUseAiChange={setUseAi}
        onContinue={continueToReview}
      />
    );
  }

  if (screen === "review") {
    return (
      <ReviewScreen
        photos={photos}
        analysis={analysis}
        onRetryAnalysis={analyze}
        place={place}
        onPick={updateLocation}
        onAddressChange={(address) => setPlace((p) => ({ ...p, address }))}
        takenAt={takenAt}
        timeSource={timeSource}
        onTakenAtChange={(date) => {
          setTakenAt(date);
          setTimeSource("manual");
        }}
        form={vehicleForm}
        suggested={suggested}
        onChange={changeVehicleField}
        driverPresent={driverPresent}
        onDriverPresentChange={setDriverPresent}
        reporterState={reporterState}
        onReporterStateChange={setReporterState}
        onBack={() => setScreen("photos")}
        onContinue={continueToNotice}
      />
    );
  }

  return (
    <NoticeScreen
      photos={photos}
      place={place}
      takenAt={takenAt}
      form={vehicleForm}
      driverPresent={driverPresent}
      reporterState={reporterState}
      draft={draft}
      onDraftChange={setDraft}
      draftRequest={draftRequest}
      currentDraftKey={draftFacts() ? draftKey(draftFacts()!, photos) : null}
      onWriteDraft={writeDraft}
      onBack={() => setScreen("review")}
    />
  );
}
