import { SiteHeader } from "@/components/SiteHeader";
import { OffensesMarquee } from "./offenses-marquee";

const GITHUB_URL = "https://github.com/lipov3cz3k/jasitadyjenom.cz";

const steps = [
  {
    title: "Vyfoťte",
    text: "Stačí fotka z telefonu. Místo a čas si aplikace přečte přímo z fotografie.",
  },
  {
    title: "Zkontrolujte",
    text: "Aplikace rozpozná registrační značku, navrhne typ přestupku a dohledá příslušný úřad. Vy jen ověříte, že vše sedí.",
  },
  {
    title: "Odešlete",
    text: "Připravený podnět zkopírujete do své datové schránky. Zprávy úřadům jsou zdarma.",
  },
];

const principles = [
  {
    title: "Fotky neukládáme",
    text: "Fotografie se zpracují jednorázově a hned se zahodí. Nemáme databázi oznamovatelů ani aut.",
  },
  {
    title: "Žádné sledování",
    text: "Bez reklam, bez Google Analytics, bez sledovacích cookies.",
  },
  {
    title: "Provoz v EU",
    text: "Aplikace běží v datacentru v Evropské unii.",
  },
  {
    title: "Otevřený kód",
    text: "Zdrojový kód je veřejný pod licencí MIT. Můžete ho zkontrolovat nebo přispět.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5 sm:px-8">
      <SiteHeader badge="Připravujeme" />

      <main className="flex-1">
        <section className="py-16 sm:py-24">
          <p className="text-lg italic text-muted">„Já si tady jenom na minutku odskočím…“</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-balance sm:text-6xl">
            Nahlaste špatně zaparkované auto za minutu.
          </h1>
          <div className="mt-6 h-1.5 w-24 rounded-full bg-line-yellow" />
          <p className="mt-6 max-w-2xl text-lg text-muted text-pretty">
            Auto na chodníku, na přechodu nebo před vjezdem? Vyfoťte ho a aplikace za vás připraví
            podnět pro příslušný úřad, který odešlete svou datovou schránkou.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href={GITHUB_URL}
              className="inline-flex items-center rounded-lg bg-sign-blue px-5 py-3 font-medium text-white transition hover:opacity-90"
            >
              Sledovat vývoj na GitHubu
            </a>
            <span className="text-sm text-muted">Aplikaci právě stavíme.</span>
          </div>
        </section>

        <section aria-label="Nejčastější prohřešky a co říká zákon" className="border-t border-border py-16">
          <OffensesMarquee />
        </section>

        <section aria-labelledby="jak-to-funguje" className="border-t border-border py-16">
          <h2 id="jak-to-funguje" className="text-2xl font-semibold tracking-tight">
            Jak to bude fungovat
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

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border py-8 text-sm text-muted">
        <span>© {new Date().getFullYear()} jasitadyjenom.cz · open source (MIT)</span>
        <a href={GITHUB_URL} className="underline-offset-4 hover:underline">
          GitHub
        </a>
      </footer>
    </div>
  );
}
