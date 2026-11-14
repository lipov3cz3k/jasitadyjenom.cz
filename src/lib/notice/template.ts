import type { Authority } from "../authority/types";
import type { LatLon } from "../photos/metadata";
import type { HarmPoint } from "../draft/schema";
import { offenseById, type OffenseId } from "./offenses";

export interface Reporter {
  fullName: string;
  address: string;
  dataBoxId?: string;
  email?: string;
}

export interface Attachment {
  name: string;
  /** Capture time from EXIF (DateTimeOriginal); `null` when the file doesn't have it. */
  takenAt: Date | null;
  /** What the photo shows (AI-written, reviewed by the user). */
  caption?: string;
}

/** AI-written prose that replaces the generic description of the conduct. */
export interface DraftText {
  facts: string;
  harm: HarmPoint[];
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
  attachments: Attachment[];
  /** The driver was at the vehicle (e.g. the reporter spoke to them). */
  driverPresent?: boolean;
  draft?: DraftText;
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

const PRAGUE = "Europe/Prague";

function formatDateTimeSeconds(date: Date): string {
  return date.toLocaleString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: PRAGUE,
  });
}

function formatTimeSeconds(date: Date): string {
  return date.toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: PRAGUE });
}

/** "od 15. 9. 2026 9:21:43 do 9:24:23 (3 min)" – the second date only when it differs. */
function formatSpan(from: Date, to: Date): string {
  const sameDay = formatDate(from) === formatDate(to);
  const minutes = Math.floor((to.getTime() - from.getTime()) / 60_000);
  const duration = minutes >= 1 ? ` (${minutes} min)` : "";
  return `od ${formatDateTimeSeconds(from)} do ${sameDay ? formatTimeSeconds(to) : formatDateTimeSeconds(to)}${duration}`;
}

/** Chronological order, files without a capture time last (stable otherwise). */
function sortByTime(attachments: Attachment[]): Attachment[] {
  return [...attachments].sort((a, b) => {
    if (!a.takenAt || !b.takenAt) return Number(!a.takenAt) - Number(!b.takenAt);
    return a.takenAt.getTime() - b.takenAt.getTime();
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

  const { draft } = input;
  const conduct = draft ? draft.facts : [offense.fact, details].filter(Boolean).join(" ");
  const qualification = offense.provision
    ? `Tím mohlo dojít k porušení ${offense.provision} ${TRAFFIC_ACT}.`
    : `Tím mohlo dojít k porušení pravidel zastavení a stání podle ${TRAFFIC_ACT}.`;

  const attachments = sortByTime(input.attachments);
  const timed = attachments.filter((a): a is Attachment & { takenAt: Date } => a.takenAt !== null);
  const first = timed[0]?.takenAt;
  const last = timed.at(-1)?.takenAt;

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
    first && last && last > first ? `Vozidlo je na fotografiích zachyceno ${formatSpan(first, last)}.` : undefined,
    "",
    "3. Popis jednání",
    conduct,
    qualification,
    offense.bans === "stopping"
      ? "Na tomto místě zákon zakazuje i zastavení vozidla, pro naplnění skutkové podstaty proto není rozhodné, jak dlouho vozidlo stálo."
      : undefined,
    (input.driverPresent ? "" : "Řidič nebyl v době pořízení fotografií u vozidla. ") +
      "Pokud se řidiče nepodaří zjistit, navrhuji postupovat " +
      `vůči provozovateli vozidla podle § 125f odst. 2 písm. a) ${TRAFFIC_ACT} (neoprávněné zastavení nebo stání).`,
    ...(draft?.harm.length
      ? ["", "Společenská škodlivost jednání:", ...draft.harm.map((h) => (h.title ? `– ${h.title}: ${h.text}` : `– ${h.text}`))]
      : []),
    "",
    "4. Důkazy",
    attachments.length
      ? "Fotografie pořízené na místě přikládám jako přílohy této zprávy:"
      : "Fotografie pořízené na místě přikládám jako přílohy této zprávy.",
    ...attachments.map(
      (a) =>
        `– ${a.name}${a.takenAt ? ` (pořízena ${formatDateTimeSeconds(a.takenAt)})` : ""}` +
        (a.caption?.trim() ? ` – ${a.caption.trim()}` : ""),
    ),
    timed.length
      ? "Časy pořízení pocházejí z metadat EXIF (údaj DateTimeOriginal) přiložených souborů. Lze je ověřit ve vlastnostech " +
        "souboru (ve Windows: pravé tlačítko myši › Vlastnosti › Podrobnosti › Datum pořízení)."
      : undefined,
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
