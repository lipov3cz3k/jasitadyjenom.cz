"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { MAX_PHOTOS } from "@/lib/analysis/schema";
import type { DraftFacts, HarmPoint, NoticeDraft } from "@/lib/draft/schema";
import { appendPhotos, postAi } from "./ai-request";
import { Notice } from "./Notice";
import type { PhotoItem } from "./PhotoPicker";

/** Draft text the user can edit; `key` ties it to the facts it was written for. */
export interface DraftState {
  key: string;
  facts: string;
  /** One point per line, "Název: text". */
  harm: string;
  /** Photo id → caption. */
  captions: Record<string, string>;
}

export function draftKey(facts: DraftFacts): string {
  return facts.offense;
}

export function harmFromLines(lines: string): HarmPoint[] {
  return lines
    .split("\n")
    .map((line) => line.trim().replace(/^[–-]\s*/, ""))
    .filter(Boolean)
    .map((line) => {
      const colon = line.indexOf(":");
      return colon > 0
        ? { title: line.slice(0, colon).trim(), text: line.slice(colon + 1).trim() }
        : { title: "", text: line };
    })
    .filter((h) => h.text);
}

interface Props {
  photos: PhotoItem[];
  facts: DraftFacts;
  draft: DraftState | null;
  onDraft: (draft: DraftState | null) => void;
}

const area = "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

export function DraftAssist({ photos, facts, draft, onDraft }: Props) {
  const [state, setState] = useState<{ kind: "idle" | "loading" } | { kind: "error"; message: string }>({ kind: "idle" });
  const [warnings, setWarnings] = useState<string[]>([]);
  const request = useRef<AbortController | null>(null);
  const stale = draft !== null && draft.key !== draftKey(facts);

  async function run() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setState({ kind: "loading" });

    const form = new FormData();
    form.set("facts", JSON.stringify(facts));
    const sent = await appendPhotos(form, photos);

    const result = await postAi<NoticeDraft>(
      "/api/draft",
      form,
      controller.signal,
      "Text se nepodařilo napsat. Použijte základní text.",
    );
    if ("aborted" in result) return;
    if (!result.ok) {
      setState({ kind: "error", message: result.message });
      return;
    }
    const { data } = result;
    onDraft({
      key: draftKey(facts),
      facts: data.facts,
      harm: data.harm.map((h) => `${h.title}: ${h.text}`).join("\n"),
      captions: Object.fromEntries(
        data.captions.flatMap((c) => (sent[c.photo - 1] ? [[sent[c.photo - 1].id, c.caption]] : [])),
      ),
    });
    setWarnings(data.warnings);
    setState({ kind: "idle" });
  }

  function update(patch: Partial<DraftState>) {
    if (draft) onDraft({ ...draft, ...patch });
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <div>
        <p className="font-medium">Text na míru pomocí AI (nepovinné)</p>
        <p className="mt-1 text-sm text-muted">
          AI podle fotek a vašeho popisu napíše popis skutku, proč jednání škodí a co dokládá která fotka. Úřad pak
          snáz pozná, že má podnět smysl řešit. Značku, místo, časy a paragrafy doplníme sami z ověřených údajů.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={state.kind === "loading"}
          className="rounded-lg bg-sign-blue px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {state.kind === "loading" ? "Píšu…" : draft ? "Napsat znovu" : "Napsat text"}
        </button>
        {draft && (
          <button
            type="button"
            onClick={() => onDraft(null)}
            className="text-sm text-muted underline-offset-4 hover:underline"
          >
            Použít základní text
          </button>
        )}
      </div>

      <p className="text-xs text-muted">
        Pošleme nejvýš {MAX_PHOTOS} fotky (zmenšené, bez metadat), váš popis a druh přestupku. Vaše jméno, adresu,
        registrační značku ani místo neposíláme. Podrobnosti v{" "}
        <Link href="/soukromi#ai" className="underline">
          zásadách soukromí
        </Link>
        .
      </p>

      {state.kind === "error" && <Notice tone="error">{state.message}</Notice>}
      {stale && (
        <Notice tone="warning">
          Od napsání textu jste změnili druh přestupku. Podnět teď používá základní text – napište
          ho znovu.
        </Notice>
      )}
      {warnings.length > 0 && !stale && (
        <Notice tone="warning">
          {warnings.map((w) => (
            <span key={w} className="block">
              {w}
            </span>
          ))}
        </Notice>
      )}

      {draft && !stale && (
        <div className="space-y-4">
          <Notice tone="info">Text je jen návrh. Přečtěte si ho a opravte vše, co neodpovídá skutečnosti.</Notice>
          <label className="block text-sm">
            <span className="font-medium">Popis jednání</span>
            <textarea className={`${area} min-h-40`} value={draft.facts} onChange={(e) => update({ facts: e.target.value })} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Proč jednání škodí</span>
            <span className="block text-xs text-muted">Jeden bod na řádek ve tvaru „Název: text“.</span>
            <textarea className={`${area} min-h-32`} value={draft.harm} onChange={(e) => update({ harm: e.target.value })} />
          </label>
          {photos.length > 0 && (
            <fieldset className="space-y-2 text-sm">
              <legend className="font-medium">Co dokládají fotky</legend>
              {photos.map((p) => (
                <label key={p.id} className="block">
                  <span className="text-xs text-muted">{p.file.name}</span>
                  <input
                    className={area}
                    value={draft.captions[p.id] ?? ""}
                    onChange={(e) => update({ captions: { ...draft.captions, [p.id]: e.target.value } })}
                    placeholder="např. celkový pohled, auto stojí všemi koly na chodníku"
                  />
                </label>
              ))}
            </fieldset>
          )}
        </div>
      )}
    </div>
  );
}
