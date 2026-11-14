import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { OffensesMarquee } from "./offenses-marquee";
import { RotatingExcuse } from "./rotating-excuse";

const GITHUB_URL = "https://github.com/lipov3cz3k/jasitadyjenom.cz";

const steps = [
  {
    title: "Vyfoťte",
    text: "Stačí fotka z telefonu. Místo a čas si aplikace přečte z fotografie, nebo je vyberete na mapě.",
  },
  {
    title: "Doplňte",
    text: "Opíšete registrační značku a vyberete, co se stalo. Příslušný úřad i jeho datovou schránku dohledá aplikace.",
  },
  {
    title: "Odešlete",
    text: "Hotový podnět zkopírujete do své datové schránky a přiložíte fotky. Zprávy úřadům jsou zdarma.",
  },
];

const principles = [
  {
    title: "Fotky neopustí váš telefon",
    text: "Fotky i vaše údaje zpracovává jen váš prohlížeč. Nemáme databázi oznamovatelů ani aut.",
  },
  {
    title: "Žádné sledování",
    text: "Bez reklam, bez analytiky, bez cookies.",
  },
  {
    title: "Poloha jen kvůli úřadu",
    text: "Souřadnice posíláme jen Českému úřadu zeměměřickému a katastrálnímu, abychom zjistili adresu a příslušný úřad.",
  },
  {
    title: "Otevřený kód",
    text: "Zdrojový kód je veřejný pod licencí MIT. Můžete ho zkontrolovat nebo přispět.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5 sm:px-8">
      <SiteHeader badge="Beta" />

      <main className="flex-1">
        <section className="pt-6 pb-10 sm:pt-8 sm:pb-12">
          <RotatingExcuse />
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-balance sm:text-5xl">
            Nahlaste špatně zaparkované auto za minutu.
          </h1>
          <div className="mt-6 h-1.5 w-24 rounded-full bg-line-yellow" />
          <p className="mt-6 max-w-2xl text-lg text-muted text-pretty">
            Auto na chodníku, na přechodu nebo před vjezdem? Vyfoťte ho a aplikace za vás připraví
            podnět pro příslušný úřad, který odešlete svou datovou schránkou.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/nahlasit"
              className="inline-flex items-center rounded-lg bg-sign-blue px-5 py-3 font-medium text-white transition hover:opacity-90"
            >
              Nahlásit auto
            </Link>
            <a href={GITHUB_URL} className="text-sm font-medium text-muted underline-offset-4 hover:underline">
              Zdrojový kód na GitHubu
            </a>
          </div>
        </section>

        <section aria-label="Nejčastější prohřešky a co říká zákon" className="border-t border-border pt-8 pb-16">
          <OffensesMarquee />
        </section>

        <section aria-labelledby="jak-to-funguje" className="border-t border-border py-16">
          <h2 id="jak-to-funguje" className="text-2xl font-semibold tracking-tight">
            Jak to funguje
          </h2>
          <ol className="mt-8 grid gap-5 sm:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="rounded-xl border border-border bg-surface p-6">
                <span className="flex size-9 items-center justify-center rounded-full bg-line-yellow font-bold text-black">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="soukromi" className="border-t border-border py-16">
          <h2 id="soukromi" className="text-2xl font-semibold tracking-tight">
            Soukromí na prvním místě
          </h2>
          <dl className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {principles.map((p) => (
              <div key={p.title}>
                <dt className="font-semibold">{p.title}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-muted">{p.text}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
