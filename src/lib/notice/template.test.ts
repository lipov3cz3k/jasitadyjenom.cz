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
  attachments: ["IMG_0001.jpg", "IMG_0002.jpg"],
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

3. Popis jednání
Vozidlo stálo na chodníku, který smějí užívat pouze chodci. Pro kočárek zbýval průchod asi 50 cm.
Tím mohlo dojít k porušení § 53 odst. 2 zákona č. 361/2000 Sb., o provozu na pozemních komunikacích.
Řidič nebyl v době pořízení fotografií u vozidla. Pokud se řidiče nepodaří zjistit, navrhuji postupovat vůči provozovateli vozidla podle § 125f odst. 2 písm. a) zákona č. 361/2000 Sb., o provozu na pozemních komunikacích (neoprávněné zastavení nebo stání).

4. Důkazy
Fotografie pořízené na místě přikládám jako přílohy této zprávy:
– IMG_0001.jpg
– IMG_0002.jpg
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
