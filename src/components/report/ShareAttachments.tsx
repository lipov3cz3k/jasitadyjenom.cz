"use client";

import { useState } from "react";
import { shareableAttachments, shareFiles } from "@/lib/pwa/share";

/** "Share" button handing the photos (and the notice as .txt) to Datovka, e-mail or Files in one go. */
export function ShareAttachments({ photos, notice, subject }: { photos: File[]; notice: File; subject: string }) {
  const [state, setState] = useState<"idle" | "sharing" | "failed">("idle");
  // Rendered only after the user has gone through the form, never on the server
  const share = typeof navigator === "undefined" ? null : shareableAttachments(photos, notice);
  if (!share) return null;

  async function onShare() {
    if (!share) return;
    setState("sharing");
    const result = await shareFiles(share.files, subject);
    setState(result === "failed" ? "failed" : "idle");
  }

  return (
    <div className="mt-2 space-y-1">
      <button
        type="button"
        onClick={onShare}
        disabled={state === "sharing"}
        className="rounded-lg bg-sign-blue px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
      >
        {share.withNotice ? "Sdílet fotky a text podnětu" : "Sdílet fotky"}
      </button>
      <p className="text-xs text-muted">
        Pošle {share.withNotice ? "fotky i text podnětu jako soubor" : "fotky"} rovnou do Datovky, e-mailu nebo
        souborů, bez hledání v galerii.
      </p>
      {state === "failed" && (
        <p className="text-xs text-muted">Sdílení se nepodařilo. Přiložte prosím fotky ručně.</p>
      )}
    </div>
  );
}
