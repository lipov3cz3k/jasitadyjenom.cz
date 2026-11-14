import Link from "next/link";
import { datasetGeneratedAt } from "@/lib/authority/dataset-info";

const GITHUB_URL = "https://github.com/lipov3cz3k/jasitadyjenom.cz";

export function SiteFooter() {
  const updated = datasetGeneratedAt().toLocaleDateString("cs-CZ", { timeZone: "Europe/Prague" });

  return (
    <footer className="space-y-3 border-t border-border py-8 text-sm text-muted">
      <nav className="flex flex-wrap gap-x-5 gap-y-2">
        <Link href="/nahlasit" className="underline-offset-4 hover:underline">
          Nahlásit auto
        </Link>
        <Link href="/soukromi" className="underline-offset-4 hover:underline">
          Ochrana soukromí
        </Link>
        <a href={GITHUB_URL} className="underline-offset-4 hover:underline">
          GitHub
        </a>
      </nav>
      <p className="text-xs leading-relaxed">
        Hranice území © ČÚZK (RÚIAN, CC BY 4.0) · Úřady a datové schránky: Registr práv a povinností · Data
        aktualizována {updated} · Mapa © OpenStreetMap, OpenMapTiles, OpenFreeMap · Open source (MIT)
      </p>
    </footer>
  );
}
