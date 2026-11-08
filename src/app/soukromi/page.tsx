import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Ochrana soukromí – jasitadyjenom.cz",
  description: "Jaká data aplikace zpracovává, kam co posílá a co neukládá.",
};

const GITHUB_ISSUES = "https://github.com/lipov3cz3k/jasitadyjenom.cz/issues";

const sections: { title: string; body: React.ReactNode }[] = [
  {
    title: "Server",
    body: (
      <>
        Web běží na Google Cloud Run v Evropské unii (Belgie). Jako u každého webu vznikají technické záznamy
        o požadavcích (IP adresa, adresa stránky, typ prohlížeče). Uchovávají se 30 dní a používáme je jen
        k zajištění provozu a bezpečnosti.
      </>
    ),
  },
  {
    title: "Cookies a analytika",
    body: <>Nepoužíváme žádné cookies, analytické nástroje ani reklamu.</>,
  },
  {
    title: "Provozovatel a kontakt",
    body: (
      <>
        Web je otevřený projekt. Dotazy a připomínky pište přes{" "}
        <a href={GITHUB_ISSUES} className="text-sign-blue underline">
          GitHub
        </a>
        .
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-5 sm:px-8">
      <SiteHeader />
      <main className="flex-1 pb-16 pt-6">
        <h1 className="text-3xl font-bold tracking-tight">Ochrana soukromí</h1>
        <p className="mt-3 text-muted">
          Aplikace je postavená tak, aby o vás věděla co nejméně. Tady je přesně, co se s čím děje.
        </p>
        <div className="mt-10 space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold">{s.title}</h2>
              <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
