"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MAX_DESCRIPTION_LENGTH, MAX_PHOTOS, type Analysis } from "@/lib/analysis/schema";
import { appendPhotos, postAi } from "./ai-request";
import { Notice } from "./Notice";
import type { PhotoItem } from "./PhotoPicker";

interface Props {
  photos: PhotoItem[];
  /** Lives in the parent: the notice text written by AI later uses it too. */
  description: string;
  onDescriptionChange: (description: string) => void;
  /** Returns labels of the form fields that were filled in. */
  onResult: (analysis: Analysis) => string[];
  onUsePlace: (place: string) => void;
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; analysis: Analysis; filled: string[]; skipped: number };

export function AiAssist({ photos, description, onDescriptionChange, onResult, onUsePlace }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const request = useRef<AbortController | null>(null);

  // The request takes seconds; the result must merge into the form as it is then, not as it was on click
  const latestOnResult = useRef(onResult);
  useEffect(() => {
    latestOnResult.current = onResult;
  });

  const canRun = photos.length > 0 || description.trim().length > 0;

  async function run() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setState({ kind: "loading" });

    const form = new FormData();
    form.set("description", description.trim());
    const sent = await appendPhotos(form, photos);
    const skipped = photos.length - sent.length;
    if (sent.length === 0 && !description.trim()) {
      setState({
        kind: "error",
        message: "Fotky se nepodařilo zpracovat (např. formát HEIC). Popište situaci slovy, nebo vyplňte formulář ručně.",
      });
      return;
    }

    const result = await postAi<Analysis>(
      "/api/analyze",
      form,
      controller.signal,
      "Rozpoznání se nepovedlo. Vyplňte prosím formulář ručně.",
    );
    if ("aborted" in result) return;
    if (!result.ok) {
      setState({ kind: "error", message: result.message });
      return;
    }
    setState({ kind: "done", analysis: result.data, filled: latestOnResult.current(result.data), skipped });
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <div>
        <p className="font-medium">Předvyplnit pomocí AI (nepovinné)</p>
        <p className="mt-1 text-sm text-muted">
          Z fotek a popisu zkusíme vyčíst registrační značku, vůz a druh přestupku. Všechno pak zkontrolujete
          a případně opravíte.
        </p>
      </div>

      <label className="block text-sm">
        <span className="font-medium">Co se stalo? (nepovinné)</span>
        <textarea
          className="mt-1 min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2"
          value={description}
          maxLength={MAX_DESCRIPTION_LENGTH}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="např. Stojí celý na chodníku před školou, s kočárkem se nedá projít."
        />
        <span className="mt-1 block text-xs text-muted">
          Napište i to, co fotky neukážou – třeba co vám řekl řidič. Popis použijeme i pro text podnětu na míru.
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={!canRun || state.kind === "loading"}
          className="rounded-lg bg-sign-blue px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {state.kind === "loading" ? "Rozpoznávám…" : state.kind === "done" ? "Rozpoznat znovu" : "Předvyplnit"}
        </button>
        {!canRun && <span className="text-sm text-muted">Nejdřív přidejte fotky nebo popis.</span>}
      </div>

      <p className="text-xs text-muted">
        Po kliknutí pošleme nejvýš {MAX_PHOTOS} fotky (zmenšené, bez polohy a dalších metadat) a popis modelu Gemini
        od Googlu. Zpracování probíhá v EU, my nic neukládáme. Podrobnosti v{" "}
        <Link href="/soukromi#ai" className="underline">
          zásadách soukromí
        </Link>
        .
      </p>

      {state.kind === "error" && <Notice tone="error">{state.message}</Notice>}
      {state.kind === "done" && <Result {...state} onUsePlace={onUsePlace} />}
    </div>
  );
}

function Result({
  analysis,
  filled,
  skipped,
  onUsePlace,
}: {
  analysis: Analysis;
  filled: string[];
  skipped: number;
  onUsePlace: (place: string) => void;
}) {
  return (
    <div className="space-y-3 text-sm">
      <Notice tone="info">
        {filled.length
          ? `Předvyplnili jsme: ${filled.join(", ")}. Zkontrolujte to prosím níže v kroku Vozidlo a přestupek.`
          : "Nic nového jsme nevyčetli. Pole, která jste už vyplnili sami, neměníme."}
      </Notice>
      {analysis.placeHint && (
        <p>
          Na fotkách je vidět místo: <strong>{analysis.placeHint}</strong>{" "}
          <button
            type="button"
            onClick={() => onUsePlace(analysis.placeHint!)}
            className="text-sign-blue underline-offset-4 hover:underline"
          >
            Použít jako adresu
          </button>
        </p>
      )}
      {skipped > 0 && (
        <p className="text-muted">
          {skipped} {skipped === 1 ? "fotku" : skipped < 5 ? "fotky" : "fotek"} jsme neposlali (víc než {MAX_PHOTOS} fotky, nebo formát, který
          prohlížeč neumí zpracovat).
        </p>
      )}
      {analysis.warnings.length > 0 && (
        <Notice tone="warning">
          {analysis.warnings.map((w) => (
            <span key={w} className="block">
              {w}
            </span>
          ))}
        </Notice>
      )}
    </div>
  );
}
