"use client";

import { useState } from "react";
import {
  checkAttachments,
  formatBytes,
  MAX_ATTACHMENTS,
  MAX_MESSAGE_BYTES,
  MIN_PARKING_SPAN_MINUTES,
} from "@/lib/photos/rules";
import { describeEditHint, type EditHint } from "@/lib/photos/editing";
import { Notice } from "./Notice";

export interface PhotoItem {
  id: string;
  file: File;
  url: string;
  /** Capture time from EXIF; `undefined` while reading, `null` when the file has none. */
  takenAt?: Date | null;
  /** Hint that the photo was edited; `undefined` while reading, `null` when it looks original. */
  edit?: EditHint | null;
}

interface Props {
  photos: PhotoItem[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
}

const tips = [
  "čitelnou registrační značku (SPZ)",
  "celé auto i s okolím – aby bylo vidět chodník, přechod, vjezd nebo zeleň",
  "dopravní značku, pokud jde o zákaz zastavení či stání",
  "u místa pro invalidy i to, že za sklem chybí parkovací průkaz",
  `u zákazu stání (ne zastavení) první a poslední fotku s odstupem aspoň ${MIN_PARKING_SPAN_MINUTES} minut, aby bylo vidět, že auto stálo`,
];

export function PhotoPicker({ photos, onAdd, onRemove }: Props) {
  const { totalBytes, tooLarge, tooMany } = checkAttachments(photos.map((p) => p.file.size));
  const withoutTime = photos.filter((p) => p.takenAt === null);
  const edited = photos.filter((p): p is PhotoItem & { edit: EditHint } => !!p.edit);

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface px-6 py-10 text-center transition hover:border-sign-blue">
        <span className="text-3xl" aria-hidden>
          📷
        </span>
        <span className="text-lg font-semibold text-sign-blue">
          {photos.length ? "Přidat další fotky" : "Vyfotit nebo vybrat fotky"}
        </span>
        <span className="text-xs text-muted">Nejlépe 2–5 fotek přímo z galerie telefonu</span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length) onAdd(files);
          }}
        />
      </label>

      {photos.length > 0 && (
        <>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {photos.map((p) => (
              <li key={p.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-surface">
                <Thumbnail photo={p} />
                <button
                  type="button"
                  onClick={() => onRemove(p.id)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white"
                  aria-label={`Odebrat ${p.file.name}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            {photos.length} {photos.length === 1 ? "fotka" : photos.length < 5 ? "fotky" : "fotek"}, celkem{" "}
            {formatBytes(totalBytes)}
          </p>
        </>
      )}

      <details className="rounded-xl border border-border bg-surface px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium">Co by mělo být na fotkách</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          {tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p className="mt-2 text-muted">
          Přikládejte fotky tak, jak je pořídil telefon – neupravené a nepřeposlané. Čas pořízení je uložený přímo v
          souboru a úřad podle něj ověří, kdy auto na místě stálo.
        </p>
      </details>

      {withoutTime.length > 0 && (
        <Notice tone="warning">
          {withoutTime.length === 1 ? "Fotka" : "Fotky"} {withoutTime.map((p) => p.file.name).join(", ")}{" "}
          {withoutTime.length === 1 ? "nemá" : "nemají"} v sobě uložený čas pořízení, takže ho úřad nebude mít čím ověřit.
          Bývá to u fotek přeposlaných přes WhatsApp nebo Messenger, upravených nebo snímků obrazovky. Pokud můžete,
          přiložte originál přímo z galerie telefonu.
        </Notice>
      )}
      {edited.length > 0 && (
        <Notice tone="warning">
          {edited.length === 1 ? "Fotka nejspíš není originál z fotoaparátu" : "Fotky nejspíš nejsou originály z fotoaparátu"}
          :{" "}
          {edited.map((p, i) => (
            <span key={p.id}>
              {i > 0 && "; "}
              {p.file.name} {describeEditHint(p.edit)}
            </span>
          ))}
          . Provozovatel vozidla by mohl namítnout, že s {edited.length === 1 ? "ní" : "nimi"} někdo manipuloval.
          Pokud můžete, přiložte místo {edited.length === 1 ? "ní neupravený originál" : "nich neupravené originály"}{" "}
          přímo z galerie telefonu.
        </Notice>
      )}
      {tooLarge && (
        <Notice tone="warning">
          Fotky mají dohromady víc než {formatBytes(MAX_MESSAGE_BYTES)}, což je limit jedné datové zprávy. Pošlete jen
          ty nejdůležitější, nebo je před přiložením zmenšete.
        </Notice>
      )}
      {tooMany && <Notice tone="warning">Datová zpráva unese nejvýš {MAX_ATTACHMENTS} příloh.</Notice>}
    </div>
  );
}

function Thumbnail({ photo }: { photo: PhotoItem }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    // e.g. HEIC, which the browser can't display – fine as an attachment
    return <span className="flex h-full items-center justify-center p-2 text-center text-xs text-muted">{photo.file.name}</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local blob URL, next/image makes no sense here
    <img src={photo.url} alt={photo.file.name} className="h-full w-full object-cover" onError={() => setFailed(true)} />
  );
}
