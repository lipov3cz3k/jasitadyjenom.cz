import { describe, expect, it } from "vitest";
import type { Authority } from "../authority/types";
import { OFFENSES } from "./offenses";
import { buildNotice, looksLikeCzechPlate, normalizePlate, type NoticeInput } from "./template";

const authority: Authority = {
  name: "Městská část Praha 10",
  dataBoxId: "irnb7wg",
  ico: "00063941",
  verification: "verified",
};

const base: NoticeInput = {
  authority,
  plate: " 1ab  2345 ",
  vehicle: "Škoda Octavia, stříbrná",
  offense: "chodnik",
  details: "Pro kočárek zbýval průchod asi 50 cm.",
  address: "Bulharská 615/5, Vršovice, 10100 Praha 10",
  point: { lat: 50.0718, lon: 14.457 },
  takenAt: new Date("2026-11-05T07:30:00Z"),
  attachments: [
    { name: "IMG_0002.jpg", takenAt: new Date("2026-11-05T07:36:05Z") },
    { name: "IMG_0001.jpg", takenAt: new Date("2026-11-05T07:30:12Z") },
  ],
  reporter: { fullName: "Jana Nováková", address: "Ruská 1, 101 00 Praha 10", dataBoxId: "abc1234", email: "" },
  createdAt: new Date("2026-11-05T09:00:00Z"),
};

describe("buildNotice", () => {
  it("notice with a name", () => {
    const { subject, body } = buildNotice(base);
    expect(subject).toBe("Podnět k zahájení řízení o přestupku – neoprávněné stání vozidla RZ 1AB 2345");
    expect(body).toBe(`Městská část Praha 10
k rukám odboru příslušného k projednávání přestupků v dopravě
ID datové schránky: irnb7wg

Věc: Podnět k zahájení řízení o přestupku – neoprávněné stání vozidla RZ 1AB 2345

Oznamovatel:
Jana Nováková, Ruská 1, 101 00 Praha 10
ID datové schránky: abc1234

Podávám podnět k zahájení řízení z moci úřední podle § 42 zákona č. 500/2004 Sb., správní řád, ve věci podezření ze spáchání přestupku podle zákona č. 361/2000 Sb., o provozu na pozemních komunikacích.

1. Vozidlo
Registrační značka: 1AB 2345
Popis vozidla: Škoda Octavia, stříbrná

2. Místo a čas
Místo: Bulharská 615/5, Vršovice, 10100 Praha 10
Souřadnice GPS: 50.071800, 14.457000
Datum a čas: 5. 11. 2026 8:30
Vozidlo je na fotografiích zachyceno od 5. 11. 2026 8:30:12 do 8:36:05 (5 min).

3. Popis jednání
Vozidlo stálo na chodníku, který smějí užívat pouze chodci. Pro kočárek zbýval průchod asi 50 cm.
Tím mohlo dojít k porušení § 53 odst. 2 zákona č. 361/2000 Sb., o provozu na pozemních komunikacích.
Na tomto místě zákon zakazuje i zastavení vozidla, pro naplnění skutkové podstaty proto není rozhodné, jak dlouho vozidlo stálo.
Řidič nebyl v době pořízení fotografií u vozidla. Pokud se řidiče nepodaří zjistit, navrhuji postupovat vůči provozovateli vozidla podle § 125f odst. 2 písm. a) zákona č. 361/2000 Sb., o provozu na pozemních komunikacích (neoprávněné zastavení nebo stání).

4. Důkazy
Fotografie pořízené na místě přikládám jako přílohy této zprávy:
– IMG_0001.jpg (pořízena 5. 11. 2026 8:30:12)
– IMG_0002.jpg (pořízena 5. 11. 2026 8:36:05)
Časy pořízení pocházejí z metadat EXIF (údaj DateTimeOriginal) přiložených souborů. Lze je ověřit ve vlastnostech souboru (ve Windows: pravé tlačítko myši › Vlastnosti › Podrobnosti › Datum pořízení).
V případě potřeby mohu ve věci podat svědeckou výpověď.

5. Žádost o sdělení
Podle § 42 správního řádu žádám o sdělení, zda bylo řízení zahájeno, ve lhůtě 30 dnů ode dne doručení tohoto podnětu.

Dne 5. 11. 2026
Jana Nováková`);
  });

  it("anonymous notice has no request for notification and no witness statement", () => {
    const { body } = buildNotice({ ...base, reporter: null });
    expect(body).toContain("Oznamovatel: anonymní");
    expect(body).not.toContain("Žádost o sdělení");
    expect(body).not.toContain("svědeckou");
    expect(body.endsWith("Anonymní oznamovatel")).toBe(true);
  });

  it("omits empty optional fields without extra blank lines", () => {
    const { body } = buildNotice({ ...base, vehicle: "  ", details: undefined });
    expect(body).toContain("Registrační značka: 1AB 2345\n\n2. Místo a čas");
    expect(body).toContain("pouze chodci.\nTím mohlo");
  });

  it("photos without an EXIF time: no span, no EXIF note, listed last", () => {
    const { body } = buildNotice({
      ...base,
      attachments: [
        { name: "forwarded.jpg", takenAt: null },
        { name: "IMG_0001.jpg", takenAt: new Date("2026-11-05T07:30:12Z") },
      ],
    });
    expect(body).not.toContain("zachyceno od");
    expect(body).toContain("– IMG_0001.jpg (pořízena 5. 11. 2026 8:30:12)\n– forwarded.jpg\n");
    expect(body).toContain("metadat EXIF");
    const none = buildNotice({ ...base, attachments: [{ name: "a.jpg", takenAt: null }] }).body;
    expect(none).not.toContain("EXIF");
  });

  it("span across midnight shows both dates", () => {
    const { body } = buildNotice({
      ...base,
      attachments: [
        { name: "a.jpg", takenAt: new Date("2026-11-05T22:58:00Z") },
        { name: "b.jpg", takenAt: new Date("2026-11-05T23:10:30Z") },
      ],
    });
    expect(body).toContain("zachyceno od 5. 11. 2026 23:58:00 do 6. 11. 2026 0:10:30 (12 min).");
  });

  it("AI draft replaces the generic description and adds harm and captions", () => {
    const { body } = buildNotice({
      ...base,
      driverPresent: true,
      draft: {
        facts: "Dodávka stála všemi koly na chodníku.\n\nŘidič byl upozorněn a odešel.",
        harm: [{ title: "Omezení průchodu chodců", text: "Zůstalo méně než 0,8 m." }],
      },
      attachments: [{ name: "PXL_1.jpg", takenAt: new Date("2026-11-05T07:30:12Z"), caption: "celkový pohled" }],
    });
    expect(body).toContain("3. Popis jednání\nDodávka stála všemi koly na chodníku.\n\nŘidič byl upozorněn a odešel.\nTím mohlo");
    expect(body).not.toContain("Pro kočárek zbýval");
    expect(body).not.toContain("Řidič nebyl");
    expect(body).toContain("Pokud se řidiče nepodaří zjistit");
    expect(body).toContain("Společenská škodlivost jednání:\n– Omezení průchodu chodců: Zůstalo méně než 0,8 m.\n\n4. Důkazy");
    expect(body).toContain("– PXL_1.jpg (pořízena 5. 11. 2026 8:30:12) – celkový pohled\n");
  });

  it("only offences that ban stopping say the duration doesn't matter", () => {
    expect(buildNotice({ ...base, offense: "zakaz-zastaveni" }).body).toContain("zakazuje i zastavení");
    expect(buildNotice({ ...base, offense: "zakaz-stani" }).body).not.toContain("zakazuje i zastavení");
    expect(buildNotice({ ...base, offense: "jine", details: "x" }).body).not.toContain("zakazuje i zastavení");
  });

  it("names the department when known", () => {
    const { body } = buildNotice({ ...base, authority: { ...authority, office: "Odbor přestupků v dopravě" } });
    expect(body.split("\n")[1]).toBe("Odbor přestupků v dopravě");
  });

  it("'other' without a specific provision uses the user's description", () => {
    const { body } = buildNotice({ ...base, offense: "jine", details: "Vozidlo stálo ve druhé řadě." });
    expect(body).toContain("3. Popis jednání\nVozidlo stálo ve druhé řadě.\nTím mohlo dojít k porušení pravidel zastavení a stání");
  });

  it("subject fits the data box message limit (255 characters)", () => {
    expect(buildNotice({ ...base, plate: "ABCDEFGH" }).subject.length).toBeLessThanOrEqual(255);
  });

  it.each(OFFENSES.filter((o) => o.provision))("$id: text obsahuje $provision", (offense) => {
    expect(buildNotice({ ...base, offense: offense.id }).body).toContain(`porušení ${offense.provision} zákona`);
  });
});

describe("plate", () => {
  it.each([
    ["1ab 2345", "1AB 2345", true],
    ["5A2 3456", "5A2 3456", true],
    ["  1ab   2345", "1AB 2345", true],
    ["B-MW 1234", "B-MW 1234", true],
    ["ab", "AB", false],
  ])("%j → %j (česká: %s)", (input, normalized, czech) => {
    expect(normalizePlate(input)).toBe(normalized);
    expect(looksLikeCzechPlate(input)).toBe(czech);
  });
});
