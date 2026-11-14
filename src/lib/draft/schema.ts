// AI-written parts of the notice. The model writes prose only; everything that can be wrong in a way
// that sinks the notice (plate, place, times, legal provisions) stays in the deterministic template.
// The output is untrusted: `parseDraft` validates it before it reaches the notice.

import { MAX_DESCRIPTION_LENGTH } from "../analysis/schema";
import { OFFENSES, type OffenseId } from "../notice/offenses";

export { MAX_PHOTO_BYTES, MAX_PHOTOS } from "../analysis/schema";

/** What the user confirmed in the form; no personal data, plate, place or time. */
export interface DraftFacts {
  offense: OffenseId;
  vehicle: string;
  /** The user's addition in the form ("Doplňující popis"). */
  details: string;
  /** Free description of the situation from the AI step ("Co se stalo?"). */
  description: string;
}

export interface HarmPoint {
  title: string;
  text: string;
}

export interface PhotoCaption {
  /** 1-based index of the photo as sent. */
  photo: number;
  caption: string;
}

export interface NoticeDraft {
  /** Description of the conduct, paragraphs separated by an empty line. */
  facts: string;
  /** Why the conduct is harmful (material element of the offence). */
  harm: HarmPoint[];
  captions: PhotoCaption[];
  warnings: string[];
}

export const MAX_FIELD_LENGTH = MAX_DESCRIPTION_LENGTH;
const MAX_HARM = 4;

export const draftJsonSchema = {
  type: "object",
  properties: {
    facts: {
      type: "string",
      description:
        "Popis skutkového děje: 1–3 krátké odstavce oddělené prázdným řádkem. Bez registrační značky, adresy, data, času a paragrafů.",
    },
    harm: {
      type: "array",
      maxItems: MAX_HARM,
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Krátký název, např. „Omezení průchodu chodců“." },
          text: { type: "string", description: "1–2 věty, konkrétně k této situaci." },
        },
        required: ["title", "text"],
      },
      description: "Body ke společenské škodlivosti jednání. Jen ty, které fotky nebo popis skutečně dokládají.",
    },
    captions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          photo: { type: "integer", description: "Pořadí fotky, jak byly přiloženy (od 1)." },
          caption: { type: "string", description: "Co fotka dokládá, jedna krátká věta bez tečky na konci." },
        },
        required: ["photo", "caption"],
      },
    },
    warnings: {
      type: "array",
      items: { type: "string" },
      maxItems: 3,
      description: "Nejvýš 3 krátká upozornění pro uživatele, např. když popis odporuje fotkám.",
    },
  },
  required: ["facts", "harm", "captions", "warnings"],
} as const;

const offenseIds = new Set<string>(OFFENSES.map((o) => o.id));

/** Validates the request body sent by the browser. Returns `null` for anything unexpected. */
export function parseFacts(raw: string): DraftFacts | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const d = data as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.length <= MAX_FIELD_LENGTH ? v.trim() : null);
  const vehicle = str(d.vehicle);
  const details = str(d.details);
  const description = str(d.description);
  if (typeof d.offense !== "string" || !offenseIds.has(d.offense)) return null;
  if (vehicle === null || details === null || description === null) return null;
  return { offense: d.offense as OffenseId, vehicle, details, description };
}

/**
 * Things the model must not write: the template states them from verified data, a wrong one
 * (an invented provision, a time that disagrees with EXIF) would undermine the whole notice.
 */
const FORBIDDEN = [
  /§/,
  /\b\d{1,2}:\d{2}\b/,
  /\b\d{1,2}\.\s?\d{1,2}\.\s?\d{4}\b/,
  /\bzákon\w*\s+č\./i,
  // Small models occasionally leak tokens of another script into Czech text
  /[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/u,
];

const isForbidden = (text: string) => FORBIDDEN.some((re) => re.test(text));

/** Facts keep their good sentences; one stray time or provision shouldn't throw the whole text away. */
function cleanFacts(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value
    .split(/\n\s*\n/)
    .map((paragraph) =>
      paragraph
        .replace(/\s+/g, " ")
        .trim()
        .split(/(?<=[.!?])\s+(?=\p{Lu})/u)
        .filter((sentence) => sentence && !isForbidden(sentence))
        .join(" "),
    )
    .filter(Boolean)
    .join("\n\n");
  return text && text.length <= 1500 ? text : null;
}

function clean(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/[ \t]+/g, " ").trim();
  if (!text || text.length > maxLength) return null;
  return isForbidden(text) ? null : text;
}

/** Validates the model output. Throws when the description of the conduct is unusable. */
export function parseDraft(raw: string, photoCount: number): NoticeDraft {
  const data: unknown = JSON.parse(raw);
  if (typeof data !== "object" || data === null || Array.isArray(data)) throw new Error("Draft is not an object");
  const d = data as Record<string, unknown>;

  const facts = cleanFacts(d.facts);
  if (!facts) throw new Error("Draft has no usable facts");

  const harm = (Array.isArray(d.harm) ? d.harm : [])
    .map((h: unknown) => {
      const item = (h ?? {}) as Record<string, unknown>;
      const title = clean(item.title, 60);
      const text = clean(item.text, 400);
      return title && text ? { title: title.replace(/[:.]$/, ""), text } : null;
    })
    .filter((h): h is HarmPoint => h !== null)
    .slice(0, MAX_HARM);

  const seen = new Set<number>();
  const captions = (Array.isArray(d.captions) ? d.captions : [])
    .map((c: unknown) => {
      const item = (c ?? {}) as Record<string, unknown>;
      const photo = item.photo;
      const caption = clean(item.caption, 200);
      if (!Number.isInteger(photo) || (photo as number) < 1 || (photo as number) > photoCount || !caption) return null;
      if (seen.has(photo as number)) return null;
      seen.add(photo as number);
      return { photo: photo as number, caption: caption.replace(/\.$/, "") };
    })
    .filter((c): c is PhotoCaption => c !== null);

  const warnings = (Array.isArray(d.warnings) ? d.warnings : [])
    .map((w: unknown) => clean(w, 200) ?? "")
    .filter(Boolean)
    .slice(0, 3);

  return { facts, harm, captions, warnings };
}
