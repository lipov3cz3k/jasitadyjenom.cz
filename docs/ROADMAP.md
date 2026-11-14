# Roadmap

## Etapa 1 – výkop ✅

- [x] Landing page (Next.js 16) + Dockerfile
- [x] Terraform: Cloud Run, Artifact Registry, WIF, domain mapping
- [x] GitHub Actions: CI a deploy
- [x] [Ruční kroky](./SETUP.md)

## Etapa 2 – nahlášení bez AI (`/nahlasit`) ✅

Principy: vše běží v prohlížeči, fotky ani údaje oznamovatele neopustí zařízení.
Poloha odchází jen do ČÚZK (adresa) a dlaždice mapy jdou přes OpenFreeMap.
Pokrytí celé ČR. Aplikace podnět neodesílá, uživatel ho zkopíruje do své datové schránky.

Adresát podnětu je úřad obce s rozšířenou působností (ORP) podle místa přestupku
(§ 125e zák. č. 361/2000 Sb.), v Praze úřad městské části Praha 1–22 podle
správního obvodu. Městská policie řízení nevede.

### PR 1 – data úřadů ✅
- [x] Pipeline `npm run data:update` (`data-pipeline/`): hranice ORP a pražských správních obvodů z ČÚZK, úřady s ID datových schránek z RPP, prostorové párování, zjednodušení (mapshaper) a TopoJSON
- [x] `data-pipeline/overrides.json`: města s městskými obvody, stav ověření
- [x] Kontroly ve skriptu: pipeline selže při nespárovaných úřadech
- [x] Knihovna `findAuthority()` (bod v polygonu + příznak „blízko hranice“)
- [x] Vitest v CI, testy na reálných bodech
- [x] Měsíční GitHub Action, která založí PR s aktualizovanými daty

### PR 2 – fotka a poloha ✅
- [x] Nahrání fotek a EXIF (`exifreader`)
- [x] Poloha: EXIF → geolokace → ruční výběr na mapě (MapLibre + OpenFreeMap)
- [x] Čas: EXIF → čas změny souboru → ruční zadání. Upozornění u fotek starších 14 dní, fotky starší než rok odmítnout.
- [x] Adresa z reverse geocodingu ČÚZK (upravitelná)
- [x] U bodu blízko hranice ověřit úřad přes ČÚZK (identify)
- [x] Návod, jaké fotky pořídit, a upozornění, když přílohy přesáhnou 20 MB

### PR 3 – podnět ✅
- [x] Formulář: SPZ, popis vozu, typ přestupku
- [x] Šablona podnětu: ochota svědčit, žádost o vyrozumění do 30 dnů, GPS, seznam příloh
- [x] Anonymní podnět s upozorněním
- [x] Údaje oznamovatele, volitelně zapamatované v localStorage
- [x] Kopírovací tlačítka a odkaz na portál datových schránek
- [x] Hláška „auto ještě stojí? volejte 156“

### PR 4 – zveřejnění ✅
- [x] Odkaz z landing page
- [x] Stránka se zásadami soukromí
- [x] Uvedení zdrojů dat (ČÚZK CC BY 4.0, RPP, OSM/OpenFreeMap) a datum aktualizace

## Etapa 3 – předvyplnění pomocí AI

Volitelné a jen na kliknutí: fotky (zmenšené v prohlížeči, bez metadat) a popis
situace jdou přes `/api/analyze` do Gemini na Vertex AI (EU endpoint, service account
Cloud Runu, žádný API klíč). Výsledek je návrh, který uživatel zkontroluje.

- [x] Endpoint `/api/analyze`: strukturovaný JSON výstup, validace odpovědi, limity na IP a na den
- [x] Z fotek a popisu: SPZ, popis vozu, druh přestupku, věcný popis, čitelné místo, upozornění na chybějící důkazy
- [x] Návrh nepřepíše, co uživatel vyplnil sám, a pole s návrhem jsou označená
- [x] Terraform: Vertex AI API, role pro runtime service account, proměnné prostředí
- [x] Zásady soukromí
- [ ] Vyhodnocení přesnosti na sadě reálných fotek a ladění promptu
- [ ] Zvážit vypnutí cache Vertex AI pro projekt

## Etapa 4 – průkaznost podnětu

Poučení z prvního odloženého podnětu: úřad napsal, že z fotek „nevyplývá, v jakém časovém
úseku a kdy přesně vozidlo na místě stálo“. Fotky neupravujeme, čas doložíme z EXIF přímo v textu.

- [x] Čas pořízení každé fotky (EXIF) v seznamu příloh, rozmezí zachycení a návod, kde ho úřad ověří
- [x] U přestupků se zákazem zastavení (§ 27 odst. 1, § 53 odst. 2, B 28) věta, že na délce stání nezáleží
- [x] Rozdělení „zákaz zastavení“ / „zákaz stání“; u zákazu stání upozornění na krátký časový úsek
- [x] Upozornění na fotky bez času pořízení (přeposlané, upravené, snímky obrazovky)
- [x] Text podnětu na míru přes LLM (`/api/draft`, druhé volání po kontrole formuláře): popis skutku,
  společenská škodlivost a popisky fotek. Kostru (úřad, oznamovatel, RZ, místo, časy z EXIF, paragrafy)
  dál skládá šablona, výstup modelu s paragrafy, daty a časy se zahazuje. Vzorový příklad v promptu
  je anonymizovaný první podnět.
- [x] Přepínač „řidič byl u vozidla“
- [ ] Vyhodnocení textů na reálných případech, případně silnější model (`GEMINI_DRAFT_MODEL`)

## Později

- Mapy.com jako zdroj map a geokódování
- Zmenšování fotek a převod HEIC na JPEG
- E2E testy (Playwright)
