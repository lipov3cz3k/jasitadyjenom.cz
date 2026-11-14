"use client";

import { useState } from "react";
import type { VehicleForm } from "@/lib/analysis/apply";
import { buildNotice, type Attachment, type Notice as NoticeText } from "@/lib/notice/template";
import { CopyButton } from "./CopyButton";
import { DraftEditor, harmFromLines, type DraftState } from "./DraftEditor";
import { Notice } from "./Notice";
import type { PhotoItem } from "./PhotoPicker";
import type { DraftRequest, PlaceState, ReporterState } from "./ReportFlow";
import { ScreenHeader, Spinner } from "./ui";

const PORTAL_URL = "https://www.mojedatovaschranka.cz/";

interface Props {
  photos: PhotoItem[];
  place: PlaceState;
  takenAt: Date | null;
  form: VehicleForm;
  driverPresent: boolean;
  reporterState: ReporterState;
  draft: DraftState | null;
  onDraftChange: (draft: DraftState | null) => void;
  draftRequest: DraftRequest;
  currentDraftKey: string | null;
  onWriteDraft: () => void;
  onBack: () => void;
}

export function NoticeScreen(props: Props) {
  const { photos, place, takenAt, form, reporterState, draftRequest } = props;
  const [editing, setEditing] = useState(false);
  const draft = props.draft && props.draft.key === props.currentDraftKey ? props.draft : null;

  const authority = place.authority?.match?.authority;
  if (!authority || !place.location || !takenAt || !form.offense) {
    // The review screen doesn't let the user here without these; guards against stale state
    return (
      <div>
        <ScreenHeader step={3} title="Podnět" onBack={props.onBack} />
        <Notice tone="warning">Některé údaje chybí. Vraťte se prosím a doplňte je.</Notice>
      </div>
    );
  }

  const attachments: Attachment[] = photos.map((p) => ({
    name: p.file.name,
    takenAt: p.takenAt ?? null,
    caption: draft?.captions[p.id],
  }));

  const notice = buildNotice({
    authority,
    plate: form.plate,
    vehicle: form.vehicle,
    offense: form.offense,
    details: form.details,
    address: place.address,
    point: place.location.point,
    takenAt,
    attachments,
    driverPresent: props.driverPresent,
    draft: draft?.facts.trim() ? { facts: draft.facts.trim(), harm: harmFromLines(draft.harm) } : undefined,
    reporter: reporterState.anonymous ? null : reporterState.reporter,
    createdAt: new Date(),
  });

  function download() {
    const blob = new Blob(["﻿" + notice.body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `podnet-RZ-${form.plate.replace(/[^0-9A-Za-z]/g, "").toUpperCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (draftRequest.kind === "loading") {
    return (
      <div>
        <ScreenHeader step={3} title="Podnět" onBack={props.onBack} />
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <Spinner />
          <p className="font-medium">Píšu text podnětu na míru…</p>
          <p className="text-sm text-muted">Obvykle to trvá do 20 sekund.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ScreenHeader step={3} title="Podnět je připravený" onBack={props.onBack} />
      <div className="space-y-6">
        <Notice tone="info">
          Auto tam pořád stojí a překáží? Volejte městskou nebo obecní policii na <strong>156</strong>. Podnět slouží
          k potrestání přestupku, auto neodtáhne.
        </Notice>

        {draftRequest.kind === "error" && <Notice tone="warning">{draftRequest.message}</Notice>}
        {draft && draft.warnings.length > 0 && (
          <Notice tone="warning">
            {draft.warnings.map((w) => (
              <span key={w} className="block">
                {w}
              </span>
            ))}
          </Notice>
        )}

        <SendSteps notice={notice} dataBoxId={authority.dataBoxId} attachments={attachments} onDownload={download} />

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">Text podnětu</p>
            <div className="flex flex-wrap gap-3 text-sm">
              {draft && (
                <button
                  type="button"
                  onClick={() => setEditing((e) => !e)}
                  className="font-medium text-sign-blue underline-offset-4 hover:underline"
                >
                  {editing ? "Hotovo" : "Upravit text"}
                </button>
              )}
              {draft ? (
                <button
                  type="button"
                  onClick={() => props.onDraftChange(null)}
                  className="text-muted underline-offset-4 hover:underline"
                >
                  Použít základní text
                </button>
              ) : (
                <button
                  type="button"
                  onClick={props.onWriteDraft}
                  className="font-medium text-sign-blue underline-offset-4 hover:underline"
                >
                  Napsat na míru pomocí AI
                </button>
              )}
            </div>
          </div>
          {draft && (
            <p className="mt-1 text-xs text-muted">
              Popis jednání napsala AI. Přečtěte si ho a opravte vše, co neodpovídá skutečnosti.
            </p>
          )}
          {draft && editing ? (
            <div className="mt-3 rounded-xl border border-border bg-surface p-4">
              <DraftEditor draft={draft} photos={photos} onChange={props.onDraftChange} />
            </div>
          ) : (
            <pre className="mt-2 max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-surface p-4 font-sans text-sm leading-relaxed">
              {notice.body}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function SendSteps({
  notice,
  dataBoxId,
  attachments,
  onDownload,
}: {
  notice: NoticeText;
  dataBoxId: string;
  attachments: Attachment[];
  onDownload: () => void;
}) {
  return (
    <ol className="space-y-3 text-sm">
      <SendStep n={1}>
        Otevřete{" "}
        <a href={PORTAL_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-sign-blue underline">
          mojedatovaschranka.cz
        </a>{" "}
        (nebo aplikaci Datovka) a vytvořte novou zprávu.
      </SendStep>
      <SendStep n={2}>
        Adresát: <span className="font-mono font-semibold">{dataBoxId}</span>
        <div className="mt-2">
          <CopyButton text={dataBoxId} label="Kopírovat ID schránky" />
        </div>
      </SendStep>
      <SendStep n={3}>
        Věc: <span className="text-muted">{notice.subject}</span>
        <div className="mt-2">
          <CopyButton text={notice.subject} label="Kopírovat předmět" />
        </div>
      </SendStep>
      <SendStep n={4}>
        Text podnětu vložte do zprávy, nebo ho přiložte jako soubor.
        <div className="mt-2 flex flex-wrap gap-2">
          <CopyButton text={notice.body} label="Kopírovat text" />
          <button
            type="button"
            onClick={onDownload}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium transition hover:border-sign-blue"
          >
            Stáhnout .txt
          </button>
        </div>
      </SendStep>
      <SendStep n={5}>
        Přiložte fotky v původní podobě z telefonu:{" "}
        <span className="text-muted">{attachments.map((a) => a.name).join(", ")}</span>
      </SendStep>
      <SendStep n={6}>Odešlete. Zprávy úřadům jsou zdarma.</SendStep>
    </ol>
  );
}

function SendStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 rounded-xl border border-border bg-surface p-4">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-line-yellow text-xs font-bold text-black">
        {n}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}
