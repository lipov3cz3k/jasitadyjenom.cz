"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
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
import { formatDateTime, fromDateTimeLocal, toDateTimeLocal } from "@/lib/datetime";
import { combineMetadata, readPhotoMetadata, type LatLon, type PhotoMetadata } from "@/lib/photos/metadata";
import { evaluatePhotoAge, OLD_AFTER_DAYS } from "@/lib/photos/rules";
import { AiAssist } from "./AiAssist";
import { AuthorityCard } from "./AuthorityCard";
import { Notice } from "./Notice";
import { PhotoPicker, type PhotoItem } from "./PhotoPicker";
import { Step } from "./Step";

// Reads localStorage (saved reporter details), so browser only
const NoticeSection = dynamic(() => import("./NoticeSection"), { ssr: false });

const LocationMap = dynamic(() => import("./LocationMap").then((m) => m.LocationMap), {
  ssr: false,
  loading: () => <div className="h-80 w-full animate-pulse rounded-xl border border-border bg-surface" />,
});

type LocationSource = "exif" | "device" | "map";
type TimeSource = "exif" | "file" | "manual";

interface Located {
  point: LatLon;
  source: LocationSource;
}

const locationSourceLabel: Record<LocationSource, string> = {
  exif: "Poloha z fotky",
  device: "Poloha z vašeho zařízení",
  map: "Poloha vybraná na mapě",
};

export function ReportFlow() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const metadata = useRef(new Map<string, PhotoMetadata>());

  const [location, setLocation] = useState<Located | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [takenAt, setTakenAt] = useState<Date | null>(null);
  const [timeSource, setTimeSource] = useState<TimeSource | null>(null);

  const [address, setAddress] = useState("");
  const [addressState, setAddressState] = useState<"idle" | "loading" | "missing">("idle");

  const [authority, setAuthority] = useState<ResolvedAuthority | null>(null);
  const [authorityState, setAuthorityState] = useState<"idle" | "loading" | "error">("idle");

  const [vehicleForm, setVehicleForm] = useState<VehicleForm>(emptyVehicleForm);
  const [suggested, setSuggested] = useState<ReadonlySet<VehicleField>>(new Set());

  const lookup = useRef<AbortController | null>(null);
  const photoUrls = useRef<string[]>([]);

  useEffect(() => {
    const urls = photoUrls.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  function updateLocation(point: LatLon, source: LocationSource) {
    setLocation({ point, source });
    setLocationError(null);

    lookup.current?.abort();
    const controller = new AbortController();
    lookup.current = controller;
    const { signal } = controller;

    // The old address would be misleading for a new place – clear it until the new one arrives
    setAddress("");
    setAddressState("loading");
    reverseGeocode(point, signal)
      .then((found) => {
        if (signal.aborted) return;
        setAddress(found ?? "");
        setAddressState(found ? "idle" : "missing");
      })
      .catch(() => {
        if (signal.aborted) return;
        setAddress("");
        setAddressState("missing");
      });

    setAuthority(null);
    setAuthorityState("loading");
    loadAuthorityIndex()
      .then((index) => resolveAuthority(index, point, signal))
      .then((result) => {
        if (signal.aborted) return;
        setAuthority(result);
        setAuthorityState("idle");
      })
      .catch(() => {
        if (!signal.aborted) setAuthorityState("error");
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
    const combined = combineMetadata([...metadata.current.values()]);

    // A photo never overrides the user's manual choice
    if (combined.gps && (!location || location.source === "exif")) updateLocation(combined.gps, "exif");
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

  function applySuggestion(analysis: Analysis): string[] {
    const applied = applyAnalysis(vehicleForm, suggested, analysis);
    setVehicleForm(applied.form);
    setSuggested(applied.suggested);
    return applied.changed.map((f) => vehicleFieldLabels[f]);
  }

  function useDeviceLocation() {
    if (!("geolocation" in navigator)) {
      setLocationError("Tento prohlížeč neumí zjistit polohu. Vyberte místo na mapě.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        updateLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }, "device");
      },
      (err) => {
        setLocating(false);
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? "Přístup k poloze je zakázaný. Povolte ho v prohlížeči, nebo vyberte místo na mapě."
            : "Polohu se nepodařilo zjistit. Vyberte místo na mapě.",
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }

  const age = takenAt ? evaluatePhotoAge(takenAt) : null;

  return (
    <div className="space-y-12">
      <Step number={1} title="Fotky">
        <div className="space-y-6">
          <PhotoPicker photos={photos} onAdd={addPhotos} onRemove={removePhoto} />
          <AiAssist photos={photos} onResult={applySuggestion} onUsePlace={setAddress} />
        </div>
      </Step>

      <Step number={2} title="Místo a čas">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={useDeviceLocation}
              disabled={locating}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium transition hover:border-sign-blue disabled:opacity-60"
            >
              {locating ? "Zjišťuji polohu…" : "Použít moji polohu"}
            </button>
            <span className="text-sm text-muted">
              {location
                ? `${locationSourceLabel[location.source]} (${location.point.lat.toFixed(5)}, ${location.point.lon.toFixed(5)})`
                : photos.length
                  ? "Fotka polohu neobsahuje – stojíte-li na místě, použijte svou polohu, jinak klikněte do mapy."
                  : "Polohu vezmeme z fotky, případně ji vyberte na mapě."}
            </span>
          </div>
          {locationError && <Notice tone="warning">{locationError}</Notice>}

          <LocationMap point={location?.point ?? null} onPick={(p) => updateLocation(p, "map")} />

          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <label className="block text-sm">
              <span className="font-medium">Adresa místa</span>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={addressState === "loading" ? "Hledám adresu…" : "např. Vinohradská 12, Praha 2"}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2"
              />
              {addressState === "missing" && (
                <span className="mt-1 block text-xs text-muted">
                  V okolí jsme nenašli adresu. Popište místo vlastními slovy (ulice, u čísla domu, křižovatka…).
                </span>
              )}
            </label>
            <label className="block text-sm">
              <span className="font-medium">Datum a čas</span>
              <input
                type="datetime-local"
                value={takenAt ? toDateTimeLocal(takenAt) : ""}
                onChange={(e) => {
                  setTakenAt(fromDateTimeLocal(e.target.value));
                  setTimeSource("manual");
                }}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2"
              />
              {timeSource === "file" && (
                <span className="mt-1 block text-xs text-muted">Čas podle souboru – zkontrolujte, že odpovídá.</span>
              )}
            </label>
          </div>

          {age === "old" && takenAt && (
            <Notice tone="warning">
              Fotka je z {formatDateTime(takenAt)}, tedy starší než {OLD_AFTER_DAYS} dní. Úřad musí jednat bez
              zbytečného odkladu, se starším podnětem už nemusí nic udělat.
            </Notice>
          )}
          {age === "expired" && (
            <Notice tone="error">Přestupek starší než rok je promlčený, podnět už nemá smysl podávat.</Notice>
          )}
          {age === "future" && <Notice tone="warning">Datum je v budoucnosti – opravte ho prosím.</Notice>}
        </div>
      </Step>

      <Step number={3} title="Příslušný úřad">
        {!location && <p className="text-sm text-muted">Úřad určíme podle místa.</p>}
        {location && authorityState === "loading" && <p className="text-sm text-muted">Hledám příslušný úřad…</p>}
        {location && authorityState === "error" && (
          <Notice tone="error">Nepodařilo se načíst seznam úřadů. Zkontrolujte připojení a zkuste to znovu.</Notice>
        )}
        {location && authorityState === "idle" && authority && <AuthorityCard result={authority} />}
      </Step>

      <NoticeSection
        step={4}
        form={vehicleForm}
        suggested={suggested}
        onChange={changeVehicleField}
        context={{
          authority: authority?.match?.authority ?? null,
          point: location?.point ?? null,
          address,
          takenAt,
          timeInvalid: age === "expired" || age === "future",
          attachments: photos.map((p) => p.file.name),
        }}
      />
    </div>
  );
}
