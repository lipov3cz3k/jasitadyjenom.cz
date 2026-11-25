"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/datetime";

// Shown when the flow picked up a report saved in this browser (see report-store.ts).
// Starting over deletes the saved copy; the photos stay in the phone's gallery.
export function ResumeNotice({ savedAt, onStartOver }: { savedAt: Date; onStartOver: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const linkClass = "font-medium text-sign-blue underline-offset-4 hover:underline";

  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-sign-blue/30 bg-sign-blue/5 px-4 py-3 text-sm leading-relaxed"
    >
      {confirming ? (
        <>
          <span>Smazat rozpracovaný podnět? Fotky v galerii telefonu zůstanou.</span>
          <span className="flex gap-4">
            <button type="button" onClick={onStartOver} className={`${linkClass} text-sign-red`}>
              Smazat a začít znovu
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={linkClass}>
              Ponechat
            </button>
          </span>
        </>
      ) : (
        <>
          <span>
            <span className="font-semibold">Pokračujete v rozpracovaném podnětu</span> z {formatDateTime(savedAt)}.
          </span>
          <button type="button" onClick={() => setConfirming(true)} className={linkClass}>
            Začít znovu
          </button>
        </>
      )}
    </div>
  );
}
