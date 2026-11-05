import type { Authority } from "../authority/types";
import type { LatLon } from "../photos/metadata";
import { offenseById, type OffenseId } from "./offenses";

export interface Reporter {
  fullName: string;
  address: string;
  dataBoxId?: string;
  email?: string;
}

export interface NoticeInput {
  authority: Authority;
  plate: string;
  vehicle?: string;
  offense: OffenseId;
  details?: string;
  address: string;
  point: LatLon;
  takenAt: Date;
  attachments: string[];
  /** `null` = anonymous notice */
  reporter: Reporter | null;
  createdAt: Date;
}

export interface Notice {
  subject: string;
  body: string;
}

const TRAFFIC_ACT = "zákona č. 361/2000 Sb., o provozu na pozemních komunikacích";

/** "1ab 2345" → "1AB 2345"; normalises spaces, otherwise leaves the plate as is (may be foreign). */
export function normalizePlate(plate: string): string {
  return plate.trim().replace(/\s+/g, " ").toLocaleUpperCase("cs");
}

/** Czech plate: 5–8 characters, letters and digits (without spaces). Foreign plates only get a warning. */
export function looksLikeCzechPlate(plate: string): boolean {
  return /^[0-9A-Z]{5,8}$/.test(normalizePlate(plate).replace(/[\s-]/g, ""));
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Europe/Prague",
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("cs-CZ", { timeZone: "Europe/Prague" });
}

export function buildNotice(input: NoticeInput): Notice {
  const plate = normalizePlate(input.plate);
  const offense = offenseById(input.offense);
  const { authority, reporter } = input;
  const details = input.details?.trim();
  const vehicle = input.vehicle?.trim();

  const subject = `Podnět k zahájení řízení o přestupku – neoprávněné stání vozidla RZ ${plate}`;

  const reporterBlock = reporter
    ? [
        "Oznamovatel:",
        `${reporter.fullName.trim()}, ${reporter.address.trim()}`,
        reporter.dataBoxId?.trim() ? `ID datové schránky: ${reporter.dataBoxId.trim()}` : undefined,
        reporter.email?.trim() ? `E-mail: ${reporter.email.trim()}` : undefined,
      ]
    : ["Oznamovatel: anonymní"];

  const conduct = [offense.fact, details].filter(Boolean).join(" ");
  const qualification = offense.provision
    ? `Tím mohlo dojít k porušení ${offense.provision} ${TRAFFIC_ACT}.`
    : `Tím mohlo dojít k porušení pravidel zastavení a stání podle ${TRAFFIC_ACT}.`;

  const lat = input.point.lat.toFixed(6);
  const lon = input.point.lon.toFixed(6);

  // `undefined` = omit the line, "" = empty line
  const lines: (string | undefined)[] = [
    authority.name,
    authority.office ?? "k rukám odboru příslušného k projednávání přestupků v dopravě",
    `ID datové schránky: ${authority.dataBoxId}`,
    "",
    `Věc: ${subject}`,
    "",
    ...reporterBlock,
    "",
    "Podávám podnět k zahájení řízení z moci úřední podle § 42 zákona č. 500/2004 Sb., správní řád, " +
      `ve věci podezření ze spáchání přestupku podle ${TRAFFIC_ACT}.`,
    "",
    "1. Vozidlo",
    `Registrační značka: ${plate}`,
    vehicle ? `Popis vozidla: ${vehicle}` : undefined,
    "",
    "2. Místo a čas",
    `Místo: ${input.address.trim()}`,
    `Souřadnice GPS: ${lat}, ${lon}`,
    `Datum a čas: ${formatDateTime(input.takenAt)}`,
    "",
    "3. Popis jednání",
    conduct,
    qualification,
    "Řidič nebyl v době pořízení fotografií u vozidla. Pokud se řidiče nepodaří zjistit, navrhuji postupovat " +
      `vůči provozovateli vozidla podle § 125f odst. 2 písm. a) ${TRAFFIC_ACT} (neoprávněné zastavení nebo stání).`,
    "",
    "4. Důkazy",
    input.attachments.length
      ? "Fotografie pořízené na místě přikládám jako přílohy této zprávy:"
      : "Fotografie pořízené na místě přikládám jako přílohy této zprávy.",
    ...input.attachments.map((name) => `– ${name}`),
    reporter ? "V případě potřeby mohu ve věci podat svědeckou výpověď." : undefined,
    ...(reporter
      ? [
          "",
          "5. Žádost o sdělení",
          "Podle § 42 správního řádu žádám o sdělení, zda bylo řízení zahájeno, ve lhůtě 30 dnů ode dne doručení tohoto podnětu.",
        ]
      : []),
    "",
    `Dne ${formatDate(input.createdAt)}`,
    reporter ? reporter.fullName.trim() : "Anonymní oznamovatel",
  ];

  return {
    subject,
    body: lines.filter((l) => l !== undefined).join("\n"),
  };
}
