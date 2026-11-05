import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { ReportFlow } from "@/components/report/ReportFlow";

export const metadata: Metadata = {
  title: "Nahlásit špatné parkování – jasitadyjenom.cz",
  // Beta, not linked from the landing page yet
  robots: { index: false, follow: false },
};

export default function ReportPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-5 sm:px-8">
      <SiteHeader badge="Beta" />
      <main className="flex-1 pb-16 pt-6">
        <h1 className="text-3xl font-bold tracking-tight">Nahlásit špatně zaparkované auto</h1>
        <p className="mt-3 text-muted">
          Vše se zpracovává jen ve vašem prohlížeči. Polohu posíláme pouze Českému úřadu zeměměřickému a katastrálnímu,
          abychom zjistili adresu a příslušný úřad.
        </p>
        <div className="mt-10">
          <ReportFlow />
        </div>
      </main>
    </div>
  );
}
