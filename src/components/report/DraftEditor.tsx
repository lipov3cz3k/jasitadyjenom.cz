"use client";

import type { DraftFacts, HarmPoint } from "@/lib/draft/schema";
import type { PhotoItem } from "./PhotoPicker";
import { inputClass } from "./ui";

/** AI-written text the user can edit; `key` ties it to the inputs it was written from. */
export interface DraftState {
  key: string;
  facts: string;
  /** One point per line, "Název: text". */
  harm: string;
  /** Photo id → caption. */
  captions: Record<string, string>;
  warnings: string[];
}

/** Any change of what the model saw (facts or photos) means the text no longer fits. */
export function draftKey(facts: DraftFacts, photos: PhotoItem[]): string {
  return JSON.stringify([facts, photos.map((p) => p.id)]);
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

export function DraftEditor({
  draft,
  photos,
  onChange,
}: {
  draft: DraftState;
  photos: PhotoItem[];
  onChange: (draft: DraftState) => void;
}) {
  const update = (patch: Partial<DraftState>) => onChange({ ...draft, ...patch });
  return (
    <div className="space-y-4">
      <label className="block text-sm">
        <span className="font-medium">Popis jednání</span>
        <textarea
          className={`${inputClass} min-h-40`}
          value={draft.facts}
          onChange={(e) => update({ facts: e.target.value })}
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Proč jednání škodí</span>
        <span className="block text-xs text-muted">Jeden bod na řádek ve tvaru „Název: text“.</span>
        <textarea
          className={`${inputClass} min-h-32`}
          value={draft.harm}
          onChange={(e) => update({ harm: e.target.value })}
        />
      </label>
      {photos.length > 0 && (
        <fieldset className="space-y-2 text-sm">
          <legend className="font-medium">Co dokládají fotky</legend>
          {photos.map((p) => (
            <label key={p.id} className="block">
              <span className="text-xs text-muted">{p.file.name}</span>
              <input
                className={inputClass}
                value={draft.captions[p.id] ?? ""}
                onChange={(e) => update({ captions: { ...draft.captions, [p.id]: e.target.value } })}
                placeholder="např. celkový pohled, auto stojí všemi koly na chodníku"
              />
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}
