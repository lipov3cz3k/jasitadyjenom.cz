import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ReportFlow } from "@/components/report/ReportFlow";

export const metadata: Metadata = {
  title: "Nahlásit špatné parkování – jasitadyjenom.cz",
  description: "Vyfoťte špatně zaparkované auto a připravte podnět pro příslušný úřad do datové schránky.",
};

export default function ReportPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-5 sm:px-8">
      <SiteHeader badge="Beta" />
      <main className="flex-1 pb-16 pt-6">
        <h1 className="text-3xl font-bold tracking-tight">Nahlásit špatně zaparkované auto</h1>
        <p className="mt-3 text-muted">
          Fotky a vaše údaje zpracovává jen váš prohlížeč. Souřadnice posíláme jen Českému úřadu zeměměřickému
          a katastrálnímu kvůli adrese a příslušnému úřadu, mapu načítáme z OpenFreeMap.{" "}
          <Link href="/soukromi" className="underline underline-offset-4">
            Podrobnosti
          </Link>
        </p>
        <div className="mt-10">
          <ReportFlow />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
