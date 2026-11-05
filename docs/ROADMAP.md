# Roadmap

## Etapa 1 – výkop ✅

- [x] Landing page (Next.js 16) + Dockerfile
- [x] Terraform: Cloud Run, Artifact Registry, WIF, domain mapping
- [x] GitHub Actions: CI a deploy
- [x] [Ruční kroky](./SETUP.md)

## Etapa 2 – nahlášení bez AI (`/nahlasit`)

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

### PR 2 – fotka a poloha
- [ ] Nahrání fotek a EXIF (`exifreader`)
- [ ] Poloha: EXIF → geolokace → ruční výběr na mapě (MapLibre + OpenFreeMap)
- [ ] Čas: EXIF → čas změny souboru → ruční zadání. Upozornění u fotek starších 14 dní, fotky starší než rok odmítnout.
- [ ] Adresa z reverse geocodingu ČÚZK (upravitelná)
- [ ] U bodu blízko hranice ověřit úřad přes ČÚZK (identify)
- [ ] Návod, jaké fotky pořídit, a upozornění, když přílohy přesáhnou 20 MB

### PR 3 – podnět
- [ ] Formulář: SPZ, popis vozu, typ přestupku
- [ ] Šablona podnětu: ochota svědčit, žádost o vyrozumění do 30 dnů, GPS, seznam příloh
- [ ] Anonymní podnět s upozorněním
- [ ] Údaje oznamovatele, volitelně zapamatované v localStorage
- [ ] Kopírovací tlačítka a odkaz na portál datových schránek
- [ ] Hláška „auto ještě stojí? volejte 156“

### PR 4 – zveřejnění
- [ ] Odkaz z landing page
- [ ] Stránka se zásadami soukromí
- [ ] Uvedení zdrojů dat (ČÚZK CC BY 4.0, RPP, OSM/OpenFreeMap) a datum aktualizace

## Později

- AI rozpoznání SPZ (Gemini + Secret Manager + rate limiting)
- Mapy.com jako zdroj map a geokódování
- Zmenšování fotek a převod HEIC na JPEG
- E2E testy (Playwright)
