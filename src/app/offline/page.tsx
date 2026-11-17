import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

// Shown by the service worker for a page it has not saved while offline
export const metadata: Metadata = {
  title: "Bez připojení – jasitadyjenom.cz",
  robots: { index: false },
};

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5 sm:px-8">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 pb-16 pt-6">
        <h1 className="text-3xl font-bold tracking-tight">Jste bez připojení</h1>
        <p className="mt-3 leading-relaxed text-muted">
          Tuhle stránku nemáme uloženou v zařízení. Podnět ale připravíte i bez internetu: čas a polohu přečteme
          z fotky a úřad najdeme v datech uložených v prohlížeči. Mapa, adresa a předvyplnění pomocí AI naskočí,
          až budete zase online.
        </p>
        <p className="mt-8">
          {/* Plain link: a full page load, which the service worker answers from its cache */}
          <a
            href="/nahlasit"
            className="inline-flex items-center rounded-xl bg-sign-blue px-5 py-3.5 text-base font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
          >
            Nahlásit auto
          </a>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
