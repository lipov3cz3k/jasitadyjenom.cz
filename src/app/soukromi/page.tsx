import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Ochrana soukromí – jasitadyjenom.cz",
  description: "Jaká data aplikace zpracovává, kam co posílá a co neukládá.",
};

const GITHUB_ISSUES = "https://github.com/lipov3cz3k/jasitadyjenom.cz/issues";

const sections: { id?: string; title: string; body: React.ReactNode }[] = [
  {
    title: "Fotky",
    body: (
      <>
        Fotky zpracovává váš prohlížeč. Čas a polohu pořízení čte přímo z fotky ve vašem zařízení. Nikam se
        neodesílají, pokud nenecháte zapnuté rozpoznání pomocí AI. Úřadu je posíláte sami jako přílohu zprávy ze své datové schránky.
      </>
    ),
  },
  {
    id: "ai",
    title: "Rozpoznání a text pomocí AI (nepovinné)",
    body: (
      <>
        Rozpoznání můžete na první obrazovce vypnout. Když ho necháte zapnuté, pošleme po kliknutí na „Pokračovat“
        nejvýš 4 fotky a váš popis situace přes náš server modelu Gemini
        ve službě Google Vertex AI. Fotky před odesláním zmenší váš prohlížeč, a tím z nich zmizí poloha, údaje
        o telefonu a další metadata. Zpracování probíhá v Evropské unii. Náš server fotky ani popis neukládá ani
        nezapisuje do záznamů. Google podle podmínek Vertex AI tato data nepoužívá k trénování modelů. Na fotkách
        může být registrační značka a lidé v okolí, posílejte proto jen to, co je pro podnět potřeba. Výsledek je
        jen návrh, který před vytvořením podnětu zkontrolujete. Pro napsání textu podnětu na míru pak pošleme stejně
        zmenšené fotky, váš popis situace, popis vozidla a druh přestupku. Vaše jméno, adresu, registrační
        značku ani místo přestupku přitom neposíláme – ty do textu doplní až váš prohlížeč.
      </>
    ),
  },
  {
    title: "Poloha",
    body: (
      <>
        Abychom zjistili adresu místa, posíláme souřadnice zaokrouhlené na zhruba 1 metr službě Českého úřadu
        zeměměřického a katastrálního (ags.cuzk.gov.cz). Pokud je místo blízko hranice dvou úřadů, ověřujeme u stejné
        služby i příslušný úřad. Jinak úřad hledáme přímo v prohlížeči podle dat, která si stáhne z našeho webu. ČÚZK
        při tom vidí souřadnice a vaši IP adresu. Polohu zařízení zjišťujeme jen po kliknutí na „Použít moji polohu“.
      </>
    ),
  },
  {
    title: "Mapa",
    body: (
      <>
        Mapové podklady načítáme ze služby OpenFreeMap (tiles.openfreemap.org), která je doručuje přes síť Cloudflare.
        Ta při tom vidí vaši IP adresu a výřez mapy, který si prohlížíte.
      </>
    ),
  },
  {
    title: "Vaše jméno a adresa",
    body: (
      <>
        Údaje oznamovatele zůstávají v prohlížeči. Uložíme je (do úložiště prohlížeče, localStorage) jen tehdy, když
        zaškrtnete „Zapamatovat v tomto prohlížeči“. Smažete je tlačítkem „Smazat uložené údaje“ nebo vymazáním dat
        webu v prohlížeči. Text podnětu odesíláte sami a my ho nevidíme.
      </>
    ),
  },
  {
    title: "Server",
    body: (
      <>
        Web běží na Google Cloud Run v Evropské unii (Belgie). Jako u každého webu vznikají technické záznamy
        o požadavcích (IP adresa, adresa stránky, typ prohlížeče). Uchovávají se 30 dní a používáme je jen
        k zajištění provozu a bezpečnosti a k souhrnné statistice: kolikrát za den se otevřely jednotlivé stránky
        a kolikrát se použila AI. Statistika obsahuje jen tyto počty, žádné IP adresy ani údaje o prohlížeči,
        a nikoho v ní nesledujeme. Abychom omezili počet použití AI, server si počítá požadavky podle IP
        adresy, ale jen v operační paměti a nic z toho neukládá.
      </>
    ),
  },
  {
    id: "aplikace",
    title: "Instalace a práce bez připojení",
    body: (
      <>
        Web si můžete přidat na plochu jako aplikaci. Aby fungoval i se slabým signálem, uloží si prohlížeč jeho
        stránky, skripty a data úřadů (Cache Storage). Poloha, odpovědi AI ani údaje oznamovatele se tam
        neukládají. Když fotku do aplikace nasdílíte z galerie, převezme ji přímo váš prohlížeč a k nám se
        neodesílá. V úložišti počká jen do otevření formuláře a pak ji smažeme. Uložená data smažete vymazáním
        dat webu v prohlížeči nebo odinstalováním aplikace.
      </>
    ),
  },
  {
    title: "Cookies a analytika",
    body: (
      <>
        Nepoužíváme žádné cookies, analytické skripty ani reklamu. V prohlížeči neběží nic, co by vás sledovalo. Pokud ručně zvolíte světlý nebo tmavý vzhled,
        zapamatuje si ho jen váš prohlížeč (localStorage).
      </>
    ),
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
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5 sm:px-8">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 pb-16 pt-6">
        <h1 className="text-3xl font-bold tracking-tight">Ochrana soukromí</h1>
        <p className="mt-3 text-muted">
          Aplikace je postavená tak, aby o vás věděla co nejméně. Tady je přesně, co se s čím děje.
        </p>
        <div className="mt-10 space-y-8">
          {sections.map((s) => (
            <section key={s.title} id={s.id} className="scroll-mt-6">
              <h2 className="text-lg font-semibold">{s.title}</h2>
              <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
            </section>
          ))}
        </div>
        <p className="mt-12">
          <Link prefetch={false} href="/nahlasit" className="font-medium text-sign-blue underline">
            Nahlásit auto →
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
