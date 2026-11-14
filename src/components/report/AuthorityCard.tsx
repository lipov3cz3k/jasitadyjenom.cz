import type { ResolvedAuthority } from "@/lib/authority/client";
import { Notice } from "./Notice";

export function AuthorityCard({ result }: { result: ResolvedAuthority }) {
  const { match, verifiedOnline } = result;

  if (!match) {
    return (
      <Notice tone="error">
        Místo leží mimo Českou republiku. Zkontrolujte polohu na mapě.
      </Notice>
    );
  }

  const { authority, area, nearBoundary } = match;
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-sm text-muted">
          {area.kind === "praha-so" ? `Správní obvod ${area.name}` : `Obec s rozšířenou působností ${area.name}`}
        </p>
        <p className="mt-1 text-lg font-semibold">{authority.name}</p>
        {authority.office && <p className="text-sm">{authority.office}</p>}
        <p className="mt-3 text-sm">
          ID datové schránky: <span className="font-mono font-semibold tracking-wider">{authority.dataBoxId}</span>
        </p>
        {verifiedOnline && <p className="mt-2 text-xs text-muted">Ověřeno podle hranic ČÚZK.</p>}
      </div>

      {nearBoundary && (
        <Notice tone="warning">
          Místo je blízko hranice dvou úřadů a ověření se nepodařilo. Zkontrolujte, že úřad odpovídá místu.
        </Notice>
      )}
      {authority.verification === "unverified" && (
        <Notice tone="warning">
          {authority.note ?? "Příslušnost tohoto úřadu jsme zatím neověřili."} Doporučujeme ji ověřit na webu města.
        </Notice>
      )}
      {authority.verification === "verified" && authority.note && <Notice tone="info">{authority.note}</Notice>}
    </div>
  );
}
