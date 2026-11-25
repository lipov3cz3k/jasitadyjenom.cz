"use client";

import { useOffline } from "next/offline";

// Shown above the report screens while the device is offline (experimental.useOffline in next.config.ts).
// Photos, time, location from EXIF and the authority work without a connection; the rest waits for it.
export function OfflineNotice() {
  const offline = useOffline();
  if (!offline) return null;
  return (
    <p
      role="status"
      className="mb-4 rounded-xl border border-line-yellow/60 bg-line-yellow/15 px-4 py-3 text-sm leading-relaxed"
    >
      <span className="font-semibold">Jste bez připojení.</span> Podnět můžete připravit dál, fotky i vyplněné
      údaje vám zůstanou, i když aplikaci zavřete. Mapa, adresa a předvyplnění pomocí AI naskočí, až budete zase online.
    </p>
  );
}
