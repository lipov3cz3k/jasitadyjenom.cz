import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ReportFlowClient } from "@/components/report/ReportFlowClient";

export const metadata: Metadata = {
  title: "Nahlásit špatné parkování – jasitadyjenom.cz",
  description: "Vyfoťte špatně zaparkované auto a připravte podnět pro příslušný úřad do datové schránky.",
};

export default function ReportPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-5 sm:px-8">
      <SiteHeader badge="Beta" />
      <main className="flex-1 pb-10 pt-4 sm:pt-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Nahlásit špatně zaparkované auto</h1>
        <p className="mt-2 text-sm text-muted">
          Vaše údaje zůstávají v prohlížeči. Fotky odešleme jen k rozpoznání pomocí AI, pokud ho necháte zapnuté.{" "}
          <Link href="/soukromi" className="underline underline-offset-4">
            Jak s daty zacházíme
          </Link>
        </p>
        <div className="mt-6">
          <ReportFlowClient />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
