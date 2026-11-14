"use client";

import { useState } from "react";
import type { VehicleField, VehicleForm } from "@/lib/analysis/apply";
import type { Authority } from "@/lib/authority/types";
import { OFFENSES, offenseById, type OffenseId } from "@/lib/notice/offenses";
import { clearReporter, loadReporter, saveReporter } from "@/lib/notice/reporter-storage";
import { buildNotice, looksLikeCzechPlate, type Attachment, type Reporter } from "@/lib/notice/template";
import type { DraftFacts } from "@/lib/draft/schema";
import type { LatLon } from "@/lib/photos/metadata";
import { MIN_PARKING_SPAN_MINUTES, photoSpanMinutes } from "@/lib/photos/rules";
import { CopyButton } from "./CopyButton";
import { DraftAssist, draftKey, harmFromLines, type DraftState } from "./DraftAssist";
import { Notice } from "./Notice";
import type { PhotoItem } from "./PhotoPicker";
import { Step } from "./Step";

const PORTAL_URL = "https://www.mojedatovaschranka.cz/";
const input = "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2";

export interface NoticeContext {
  authority: Authority | null;
  point: LatLon | null;
  address: string;
  takenAt: Date | null;
  /** The photo is past the limitation period or dated in the future. */
  timeInvalid: boolean;
  photos: PhotoItem[];
  /** The user's description of the situation from the AI step. */
  description: string;
}

const emptyReporter: Reporter = { fullName: "", address: "", dataBoxId: "", email: "" };

interface Props {
  context: NoticeContext;
  step: number;
  form: VehicleForm;
  /** Fields pre-filled by the AI that the user hasn't edited yet. */
  suggested: ReadonlySet<VehicleField>;
  onChange: <K extends VehicleField>(field: K, value: VehicleForm[K]) => void;
}

export default function NoticeSection({ context, step, form, suggested, onChange }: Props) {
  const { plate, vehicle, offense, details } = form;

  // The component renders only in the browser (ssr: false), so localStorage is available
  const [stored] = useState(loadReporter);
  const [anonymous, setAnonymous] = useState(false);
  const [reporter, setReporter] = useState<Reporter>(stored ?? emptyReporter);
  const [remember, setRemember] = useState(stored !== null);

  const [requested, setRequested] = useState(false);
  const [driverPresent, setDriverPresent] = useState(false);
  const [draft, setDraft] = useState<DraftState | null>(null);

  const draftFacts: DraftFacts | null = offense
    ? { offense, vehicle: vehicle.trim(), details: details.trim(), description: context.description.trim() }
    : null;
  const activeDraft = draft && draftFacts && draft.key === draftKey(draftFacts) ? draft : null;

  const attachments: Attachment[] = context.photos.map((p) => ({
    name: p.file.name,
    takenAt: p.takenAt ?? null,
    caption: activeDraft?.captions[p.id],
  }));

  const span = photoSpanMinutes(attachments.flatMap((a) => (a.takenAt ? [a.takenAt] : [])));
  const shortForParking =
    offense !== "" &&
    offenseById(offense).bans === "parking" &&
    attachments.length > 0 &&
    (span === null || span < MIN_PARKING_SPAN_MINUTES);

  const missing = [
    attachments.length === 0 && "fotky",
    !context.point && "místo",
    !context.authority && "příslušný úřad",
    !context.address.trim() && "adresa místa",
    !context.takenAt && "datum a čas",
    context.timeInvalid && "platné datum (ne starší než rok a ne v budoucnosti)",
    !plate.trim() && "registrační značka",
    !offense && "druh přestupku",
    offense === "jine" && !details.trim() && "popis přestupku",
    !anonymous && !reporter.fullName.trim() && "vaše jméno",
    !anonymous && !reporter.address.trim() && "vaše adresa",
  ].filter((m): m is string => Boolean(m));

  function updateReporter(field: keyof Reporter, value: string) {
    setReporter((r) => ({ ...r, [field]: value }));
  }

  function generate() {
    if (!anonymous) {
      if (remember) saveReporter(reporter);
      else clearReporter();
    }
    setRequested(true);
  }

  // The text is derived from the inputs – once created it follows every further change
  const notice =
    requested && missing.length === 0 && context.authority && context.point && context.takenAt && offense
      ? buildNotice({
          authority: context.authority,
          plate,
          vehicle,
          offense,
          details,
          address: context.address,
          point: context.point,
          takenAt: context.takenAt,
          attachments,
          driverPresent,
          draft: activeDraft?.facts.trim()
            ? { facts: activeDraft.facts.trim(), harm: harmFromLines(activeDraft.harm) }
            : undefined,
          reporter: anonymous ? null : reporter,
          createdAt: new Date(),
        })
      : null;

  function download() {
    if (!notice) return;
    const blob = new Blob(["﻿" + notice.body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `podnet-RZ-${plate.replace(/[^0-9A-Za-z]/g, "").toUpperCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-12">
      <Notice tone="info">
        Auto tam pořád stojí a překáží? Volejte městskou nebo obecní policii na <strong>156</strong> – může zasáhnout
        hned. Podnět úřadu slouží k potrestání přestupku, auto neodtáhne.
      </Notice>

      <Step number={step} title="Vozidlo a přestupek">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <FieldLabel suggested={suggested.has("plate")}>Registrační značka (SPZ)</FieldLabel>
              <input
                className={`${input} font-mono uppercase tracking-wider`}
                value={plate}
                onChange={(e) => onChange("plate", e.target.value)}
                placeholder="1AB 2345"
                autoCapitalize="characters"
                autoComplete="off"
              />
              {plate.trim() && !looksLikeCzechPlate(plate) && (
                <span className="mt-1 block text-xs text-muted">
                  Nevypadá jako česká značka – u zahraniční ji opište přesně, jak je na tabulce.
                </span>
              )}
            </label>
            <label className="block text-sm">
              <FieldLabel suggested={suggested.has("vehicle")}>Popis vozidla (nepovinné)</FieldLabel>
              <input
                className={input}
                value={vehicle}
                onChange={(e) => onChange("vehicle", e.target.value)}
                placeholder="např. Škoda Octavia, stříbrná"
              />
            </label>
          </div>

          <label className="block text-sm">
            <FieldLabel suggested={suggested.has("offense")}>Co se stalo</FieldLabel>
            <select className={input} value={offense} onChange={(e) => onChange("offense", e.target.value as OffenseId)}>
              <option value="" disabled>
                Vyberte…
              </option>
              {OFFENSES.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {shortForParking && (
            <Notice tone="warning">
              Zákaz stání nebrání krátkému zastavení, třeba k vystoupení nebo naložení. Z fotek by proto mělo být
              poznat, že auto stálo déle – ideálně první a poslední fotka s odstupem aspoň {MIN_PARKING_SPAN_MINUTES}{" "}
              minut.{" "}
              {span === null
                ? "Teď nejde určit, jak dlouho auto stálo (chybí aspoň dvě fotky s časem pořízení)."
                : `Vaše fotky pokrývají jen ${Math.floor(span)} min.`}{" "}
              Jinak úřad podnět nejspíš odloží.
            </Notice>
          )}

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={driverPresent}
              onChange={(e) => setDriverPresent(e.target.checked)}
            />
            <span>
              Řidič byl u vozidla (např. jste s ním mluvili)
              <span className="block text-xs text-muted">
                Jinak podnět uvede, že řidič u vozidla nebyl. Co vám řekl, popište v doplňujícím popisu.
              </span>
            </span>
          </label>

          <label className="block text-sm">
            <FieldLabel suggested={suggested.has("details")}>
              {offense === "jine" ? "Popis přestupku" : "Doplňující popis (nepovinné)"}
            </FieldLabel>
            <textarea
              className={`${input} min-h-24`}
              value={details}
              onChange={(e) => onChange("details", e.target.value)}
              placeholder="např. Chodci museli obcházet auto po silnici."
            />
          </label>
        </div>
      </Step>

      <Step number={step + 1} title="Oznamovatel">
        <div className="space-y-4">
          <fieldset className="space-y-2 text-sm">
            <legend className="sr-only">Způsob podání</legend>
            <label className="flex items-start gap-2">
              <input type="radio" className="mt-1" checked={!anonymous} onChange={() => setAnonymous(false)} />
              <span>
                <span className="font-medium">Se jménem</span>
                <span className="block text-muted">
                  Úřad vám musí do 30 dnů sdělit, jak s podnětem naložil, a může vás vyslechnout jako svědka.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input type="radio" className="mt-1" checked={anonymous} onChange={() => setAnonymous(true)} />
              <span>
                <span className="font-medium">Anonymně</span>
                <span className="block text-muted">
                  Úřad nemá povinnost odpovědět. Vaši totožnost ale stejně prozradí datová schránka, ze které podnět
                  pošlete.
                </span>
              </span>
            </label>
          </fieldset>

          {!anonymous && (
            <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-medium">Jméno a příjmení</span>
                  <input
                    className={input}
                    value={reporter.fullName}
                    autoComplete="name"
                    onChange={(e) => updateReporter("fullName", e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">Adresa bydliště</span>
                  <input
                    className={input}
                    value={reporter.address}
                    autoComplete="street-address"
                    onChange={(e) => updateReporter("address", e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">ID vaší datové schránky (nepovinné)</span>
                  <input
                    className={`${input} font-mono`}
                    value={reporter.dataBoxId}
                    onChange={(e) => updateReporter("dataBoxId", e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">E-mail (nepovinné)</span>
                  <input
                    className={input}
                    type="email"
                    value={reporter.email}
                    autoComplete="email"
                    onChange={(e) => updateReporter("email", e.target.value)}
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  Zapamatovat v tomto prohlížeči
                </label>
                {stored && (
                  <button
                    type="button"
                    className="text-muted underline-offset-4 hover:underline"
                    onClick={() => {
                      clearReporter();
                      setRemember(false);
                      setReporter(emptyReporter);
                    }}
                  >
                    Smazat uložené údaje
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </Step>

      <Step number={step + 2} title="Podnět">
        {missing.length > 0 ? (
          <p className="text-sm text-muted">Pro vytvoření podnětu ještě chybí: {missing.join(", ")}.</p>
        ) : !requested ? (
          <button
            type="button"
            onClick={generate}
            className="rounded-lg bg-sign-blue px-5 py-3 font-medium text-white transition hover:opacity-90"
          >
            Vytvořit text podnětu
          </button>
        ) : (
          notice &&
          draftFacts && (
            <div className="space-y-8">
              <DraftAssist photos={context.photos} facts={draftFacts} draft={draft} onDraft={setDraft} />
              <NoticeOutput
                notice={notice}
                dataBoxId={context.authority!.dataBoxId}
                attachments={attachments.map((a) => a.name)}
                onDownload={download}
              />
            </div>
          )
        )}
      </Step>
    </div>
  );
}

function FieldLabel({ suggested, children }: { suggested: boolean; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 font-medium">
      {children}
      {suggested && (
        <span className="rounded-full bg-sign-blue/10 px-2 py-0.5 text-xs font-medium text-sign-blue">
          návrh AI – zkontrolujte
        </span>
      )}
    </span>
  );
}

function NoticeOutput({
  notice,
  dataBoxId,
  attachments,
  onDownload,
}: {
  notice: ReturnType<typeof buildNotice>;
  dataBoxId: string;
  attachments: string[];
  onDownload: () => void;
}) {
  return (
    <div className="space-y-6">
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>
          Přihlaste se do své datové schránky na{" "}
          <a
            href={PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sign-blue underline"
          >
            mojedatovaschranka.cz
          </a>{" "}
          a vytvořte novou zprávu.
        </li>
        <li>
          Jako adresáta zadejte ID schránky <span className="font-mono font-semibold">{dataBoxId}</span>{" "}
          <CopyButton text={dataBoxId} label="Kopírovat ID" />
        </li>
        <li>
          Do věci vložte předmět. <CopyButton text={notice.subject} label="Kopírovat předmět" />
        </li>
        <li>
          Text podnětu vložte do zprávy, nebo ho přiložte jako soubor.{" "}
          <span className="inline-flex flex-wrap gap-2">
            <CopyButton text={notice.body} label="Kopírovat text" />
            <button
              type="button"
              onClick={onDownload}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium transition hover:border-sign-blue"
            >
              Stáhnout jako .txt
            </button>
          </span>
        </li>
        <li>Přiložte fotky: {attachments.join(", ")}.</li>
        <li>Odešlete. Zprávy úřadům jsou zdarma.</li>
      </ol>

      <div>
        <p className="text-sm font-medium">Předmět</p>
        <p className="mt-1 rounded-lg border border-border bg-surface p-3 text-sm">{notice.subject}</p>
      </div>
      <div>
        <p className="text-sm font-medium">Text podnětu</p>
        <pre className="mt-1 max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-surface p-4 font-sans text-sm leading-relaxed">
          {notice.body}
        </pre>
      </div>
    </div>
  );
}
