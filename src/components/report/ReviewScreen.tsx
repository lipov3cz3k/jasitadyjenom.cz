"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { VehicleField, VehicleForm } from "@/lib/analysis/apply";
import { formatDateTime, fromDateTimeLocal, toDateTimeLocal } from "@/lib/datetime";
import { OFFENSES, offenseById, type OffenseId } from "@/lib/notice/offenses";
import { clearReporter } from "@/lib/notice/reporter-storage";
import { looksLikeCzechPlate, type Reporter } from "@/lib/notice/template";
import type { LatLon } from "@/lib/photos/metadata";
import { evaluatePhotoAge, MIN_PARKING_SPAN_MINUTES, OLD_AFTER_DAYS, photoSpanMinutes } from "@/lib/photos/rules";
import { AuthorityCard } from "./AuthorityCard";
import { Notice } from "./Notice";
import type { PhotoItem } from "./PhotoPicker";
import type { AnalysisState, LocationSource, PlaceState, ReporterState, TimeSource } from "./ReportFlow";
import { ActionBar, FieldLabel, inputClass, PrimaryButton, ScreenHeader, Section, Spinner } from "./ui";

const LocationMap = dynamic(() => import("./LocationMap").then((m) => m.LocationMap), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-xl border border-border bg-background" />,
});

const locationSourceLabel: Record<LocationSource, string> = {
  exif: "podle fotky",
  device: "podle vašeho zařízení",
  map: "vybráno na mapě",
};

interface Props {
  photos: PhotoItem[];
  analysis: AnalysisState;
  onRetryAnalysis: () => void;
  place: PlaceState;
  onPick: (point: LatLon, source: LocationSource) => void;
  onAddressChange: (address: string) => void;
  takenAt: Date | null;
  timeSource: TimeSource | null;
  onTakenAtChange: (date: Date | null) => void;
  form: VehicleForm;
  suggested: ReadonlySet<VehicleField>;
  onChange: <K extends VehicleField>(field: K, value: VehicleForm[K]) => void;
  driverPresent: boolean;
  onDriverPresentChange: (value: boolean) => void;
  reporterState: ReporterState;
  onReporterStateChange: (state: ReporterState) => void;
  onBack: () => void;
  onContinue: () => void;
}

/** What still prevents creating the notice; shared with the notice screen. */
export function missingFields({
  photos,
  place,
  takenAt,
  form,
  reporterState,
}: Pick<Props, "photos" | "place" | "takenAt" | "form" | "reporterState">): string[] {
  const age = takenAt ? evaluatePhotoAge(takenAt) : null;
  const { reporter, anonymous } = reporterState;
  return [
    photos.length === 0 && "fotky",
    !place.location && "místo",
    place.location && !place.authority?.match && place.authorityState !== "loading" && "příslušný úřad",
    !place.address.trim() && "adresa místa",
    !takenAt && "datum a čas",
    (age === "expired" || age === "future") && "platné datum",
    !form.plate.trim() && "registrační značka",
    !form.offense && "druh přestupku",
    form.offense === "jine" && !form.details.trim() && "popis přestupku",
    !anonymous && !reporter.fullName.trim() && "vaše jméno",
    !anonymous && !reporter.address.trim() && "vaše adresa",
  ].filter((m): m is string => Boolean(m));
}

export function ReviewScreen(props: Props) {
  const { analysis, form, suggested, onChange, place, takenAt } = props;
  const missing = missingFields(props);
  const loading = analysis.kind === "loading";

  return (
    <div>
      <ScreenHeader step={2} title="Zkontrolujte údaje" onBack={props.onBack} />
      <div className="space-y-4">
        <AnalysisBanner analysis={analysis} onRetry={props.onRetryAnalysis} />

        <Section title="Vozidlo a přestupek" aside={loading && <Spinner />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <FieldLabel suggested={suggested.has("plate")}>Registrační značka</FieldLabel>
              <input
                className={`${inputClass} font-mono uppercase tracking-wider`}
                value={form.plate}
                onChange={(e) => onChange("plate", e.target.value)}
                placeholder={loading ? "Rozpoznávám…" : "1AB 2345"}
                autoCapitalize="characters"
                autoComplete="off"
              />
              {form.plate.trim() && !looksLikeCzechPlate(form.plate) && (
                <span className="mt-1 block text-xs text-muted">
                  Nevypadá jako česká značka – u zahraniční ji opište přesně, jak je na tabulce.
                </span>
              )}
            </label>
            <label className="block text-sm">
              <FieldLabel suggested={suggested.has("vehicle")}>Vůz (nepovinné)</FieldLabel>
              <input
                className={inputClass}
                value={form.vehicle}
                onChange={(e) => onChange("vehicle", e.target.value)}
                placeholder={loading ? "Rozpoznávám…" : "např. Škoda Octavia, stříbrná"}
              />
            </label>
          </div>

          <label className="block text-sm">
            <FieldLabel suggested={suggested.has("offense")}>Co se stalo</FieldLabel>
            <select
              className={inputClass}
              value={form.offense}
              onChange={(e) => onChange("offense", e.target.value as OffenseId)}
            >
              <option value="" disabled>
                {loading ? "Rozpoznávám…" : "Vyberte…"}
              </option>
              {OFFENSES.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <ParkingSpanWarning photos={props.photos} offense={form.offense} />

          <label className="block text-sm">
            <FieldLabel suggested={suggested.has("details")}>
              {form.offense === "jine" ? "Popis přestupku" : "Doplnění (nepovinné)"}
            </FieldLabel>
            <textarea
              className={`${inputClass} min-h-20`}
              value={form.details}
              onChange={(e) => onChange("details", e.target.value)}
              placeholder="např. Chodci museli obcházet auto po silnici."
            />
          </label>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-5 shrink-0"
              checked={props.driverPresent}
              onChange={(e) => props.onDriverPresentChange(e.target.checked)}
            />
            <span>Řidič byl u vozidla (např. jste s ním mluvili)</span>
          </label>
        </Section>

        <PlaceSection {...props} />

        <TimeSection takenAt={takenAt} timeSource={props.timeSource} onChange={props.onTakenAtChange} />

        <Section title="Příslušný úřad">
          {!place.location && <p className="text-sm text-muted">Určíme ho podle místa.</p>}
          {place.location && place.authorityState === "loading" && (
            <p className="text-sm text-muted">
              <Spinner /> Hledám příslušný úřad…
            </p>
          )}
          {place.location && place.authorityState === "error" && (
            <Notice tone="error">Nepodařilo se načíst seznam úřadů. Zkontrolujte připojení a vyberte místo znovu.</Notice>
          )}
          {place.location && place.authorityState === "idle" && place.authority && (
            <AuthorityCard result={place.authority} />
          )}
        </Section>

        <ReporterSection state={props.reporterState} onChange={props.onReporterStateChange} />
      </div>

      <ActionBar>
        {missing.length > 0 && <p className="mb-2 text-sm text-muted">Ještě chybí: {missing.join(", ")}.</p>}
        <PrimaryButton onClick={props.onContinue} disabled={missing.length > 0}>
          Vytvořit podnět
        </PrimaryButton>
      </ActionBar>
    </div>
  );
}

function AnalysisBanner({ analysis, onRetry }: { analysis: AnalysisState; onRetry: () => void }) {
  if (analysis.kind === "off") return null;
  if (analysis.kind === "loading") {
    return (
      <Notice tone="info">
        <Spinner /> Rozpoznávám údaje z fotek… Mezitím můžete zkontrolovat místo a čas.
      </Notice>
    );
  }
  if (analysis.kind === "error") {
    return (
      <Notice tone="error">
        {analysis.message}{" "}
        <button type="button" onClick={onRetry} className="font-medium underline underline-offset-4">
          Zkusit znovu
        </button>
      </Notice>
    );
  }
  const { analysis: result, filled, skipped } = analysis;
  return (
    <div className="space-y-2">
      <Notice tone="info">
        {filled.length
          ? `Z fotek jsme vyčetli: ${filled.join(", ")}. Zkontrolujte to prosím.`
          : "Z fotek jsme nic nového nevyčetli, doplňte prosím údaje ručně."}
        {skipped > 0 && ` (${skipped} ${skipped === 1 ? "fotku" : "fotek"} jsme neposlali.)`}
      </Notice>
      {result.warnings.length > 0 && (
        <Notice tone="warning">
          {result.warnings.map((w) => (
            <span key={w} className="block">
              {w}
            </span>
          ))}
        </Notice>
      )}
    </div>
  );
}

function ParkingSpanWarning({ photos, offense }: { photos: PhotoItem[]; offense: OffenseId | "" }) {
  if (!offense || offenseById(offense).bans !== "parking" || photos.length === 0) return null;
  const span = photoSpanMinutes(photos.flatMap((p) => (p.takenAt ? [p.takenAt] : [])));
  if (span !== null && span >= MIN_PARKING_SPAN_MINUTES) return null;
  return (
    <Notice tone="warning">
      Zákaz stání nebrání krátkému zastavení, třeba k vystoupení nebo naložení. Z fotek by mělo být poznat, že auto
      stálo déle – ideálně první a poslední fotka s odstupem aspoň {MIN_PARKING_SPAN_MINUTES} minut.{" "}
      {span === null
        ? "Teď nejde určit, jak dlouho auto stálo (chybí aspoň dvě fotky s časem pořízení)."
        : `Vaše fotky pokrývají jen ${Math.floor(span)} min.`}
    </Notice>
  );
}

function PlaceSection({ place, onPick, onAddressChange, analysis }: Props) {
  const [mapOpen, setMapOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showMap = mapOpen || !place.location;
  const placeHint = analysis.kind === "done" ? analysis.analysis.placeHint : null;

  function useDeviceLocation() {
    if (!("geolocation" in navigator)) {
      setError("Tento prohlížeč neumí zjistit polohu. Vyberte místo na mapě.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onPick({ lat: pos.coords.latitude, lon: pos.coords.longitude }, "device");
      },
      (err) => {
        setLocating(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Přístup k poloze je zakázaný. Povolte ho v prohlížeči, nebo vyberte místo na mapě."
            : "Polohu se nepodařilo zjistit. Vyberte místo na mapě.",
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }

  return (
    <Section
      title="Místo"
      aside={
        place.location && (
          <button
            type="button"
            onClick={() => setMapOpen((o) => !o)}
            className="text-sm font-medium text-sign-blue underline-offset-4 hover:underline"
          >
            {mapOpen ? "Skrýt mapu" : "Upravit na mapě"}
          </button>
        )
      }
    >
      {!place.location && (
        <p className="text-sm text-muted">
          Fotky polohu neobsahují. Stojíte-li u auta, použijte svou polohu, jinak klepněte do mapy.
        </p>
      )}

      <label className="block text-sm">
        <span className="font-medium">Adresa</span>
        {place.location && <span className="ml-2 text-xs text-muted">{locationSourceLabel[place.location.source]}</span>}
        <input
          type="text"
          className={inputClass}
          value={place.address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder={place.addressState === "loading" ? "Hledám adresu…" : "např. Vinohradská 12, Praha 2"}
        />
        {place.addressState === "missing" && (
          <span className="mt-1 block text-xs text-muted">
            V okolí jsme nenašli adresu. Popište místo vlastními slovy (ulice, u čísla domu, křižovatka…).
          </span>
        )}
      </label>
      {placeHint && placeHint !== place.address && (
        <p className="text-sm">
          Na fotkách je vidět: <strong>{placeHint}</strong>{" "}
          <button
            type="button"
            onClick={() => onAddressChange(placeHint)}
            className="text-sign-blue underline-offset-4 hover:underline"
          >
            Použít
          </button>
        </p>
      )}

      {showMap && (
        <>
          <button
            type="button"
            onClick={useDeviceLocation}
            disabled={locating}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium transition hover:border-sign-blue disabled:opacity-60 sm:w-auto"
          >
            {locating ? "Zjišťuji polohu…" : "📍 Použít moji polohu"}
          </button>
          {error && <Notice tone="warning">{error}</Notice>}
          <LocationMap point={place.location?.point ?? null} onPick={(p) => onPick(p, "map")} />
        </>
      )}
    </Section>
  );
}

function TimeSection({
  takenAt,
  timeSource,
  onChange,
}: {
  takenAt: Date | null;
  timeSource: TimeSource | null;
  onChange: (date: Date | null) => void;
}) {
  const age = takenAt ? evaluatePhotoAge(takenAt) : null;
  return (
    <Section title="Čas">
      <label className="block text-sm">
        <span className="font-medium">Datum a čas</span>
        {timeSource === "exif" && <span className="ml-2 text-xs text-muted">podle fotky</span>}
        <input
          type="datetime-local"
          value={takenAt ? toDateTimeLocal(takenAt) : ""}
          onChange={(e) => onChange(fromDateTimeLocal(e.target.value))}
          className={inputClass}
        />
        {timeSource === "file" && (
          <span className="mt-1 block text-xs text-muted">Čas podle souboru – zkontrolujte, že odpovídá.</span>
        )}
      </label>
      {age === "old" && takenAt && (
        <Notice tone="warning">
          Fotka je z {formatDateTime(takenAt)}, tedy starší než {OLD_AFTER_DAYS} dní. Úřad musí jednat bez zbytečného
          odkladu, se starším podnětem už nemusí nic udělat.
        </Notice>
      )}
      {age === "expired" && (
        <Notice tone="error">Přestupek starší než rok je promlčený, podnět už nemá smysl podávat.</Notice>
      )}
      {age === "future" && <Notice tone="warning">Datum je v budoucnosti – opravte ho prosím.</Notice>}
    </Section>
  );
}

function ReporterSection({ state, onChange }: { state: ReporterState; onChange: (state: ReporterState) => void }) {
  const { reporter, anonymous, remember, stored } = state;
  const [editing, setEditing] = useState(!stored);
  const update = (field: keyof Reporter, value: string) =>
    onChange({ ...state, reporter: { ...reporter, [field]: value } });

  return (
    <Section
      title="Oznamovatel"
      aside={
        !anonymous &&
        !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm font-medium text-sign-blue underline-offset-4 hover:underline"
          >
            Změnit
          </button>
        )
      }
    >
      <div className="grid grid-cols-2 gap-2 text-sm" role="radiogroup" aria-label="Způsob podání">
        {[
          { value: false, label: "Se jménem" },
          { value: true, label: "Anonymně" },
        ].map((o) => (
          <button
            key={o.label}
            type="button"
            role="radio"
            aria-checked={anonymous === o.value}
            onClick={() => onChange({ ...state, anonymous: o.value })}
            className={`rounded-lg border px-3 py-2 font-medium transition ${
              anonymous === o.value ? "border-sign-blue bg-sign-blue/10 text-sign-blue" : "border-border"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">
        {anonymous
          ? "Úřad nemá povinnost odpovědět. Vaši totožnost ale stejně prozradí datová schránka, ze které podnět pošlete."
          : "Úřad vám musí do 30 dnů sdělit, jak s podnětem naložil, a může vás vyslechnout jako svědka."}
      </p>

      {!anonymous && !editing && (
        <p className="text-sm">
          <span className="font-medium">{reporter.fullName}</span>, {reporter.address}
          {reporter.dataBoxId && <span className="text-muted"> · DS {reporter.dataBoxId}</span>}
        </p>
      )}

      {!anonymous && editing && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium">Jméno a příjmení</span>
              <input
                className={inputClass}
                value={reporter.fullName}
                autoComplete="name"
                onChange={(e) => update("fullName", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Adresa bydliště</span>
              <input
                className={inputClass}
                value={reporter.address}
                autoComplete="street-address"
                onChange={(e) => update("address", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">ID datové schránky (nepovinné)</span>
              <input
                className={`${inputClass} font-mono`}
                value={reporter.dataBoxId}
                autoCapitalize="none"
                onChange={(e) => update("dataBoxId", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">E-mail (nepovinné)</span>
              <input
                className={inputClass}
                type="email"
                value={reporter.email}
                autoComplete="email"
                onChange={(e) => update("email", e.target.value)}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4"
                checked={remember}
                onChange={(e) => onChange({ ...state, remember: e.target.checked })}
              />
              Zapamatovat v tomto prohlížeči
            </label>
            {stored && (
              <button
                type="button"
                className="text-muted underline-offset-4 hover:underline"
                onClick={() => {
                  clearReporter();
                  onChange({
                    ...state,
                    reporter: { fullName: "", address: "", dataBoxId: "", email: "" },
                    remember: false,
                    stored: false,
                  });
                }}
              >
                Smazat uložené údaje
              </button>
            )}
          </div>
        </>
      )}
    </Section>
  );
}
