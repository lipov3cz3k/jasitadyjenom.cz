// Shape of the AI analysis shared by the API route and the browser.
// Everything the model returns is untrusted: `parseAnalysis` validates it before it reaches the form.

import { OFFENSES, type OffenseId } from "../notice/offenses";
import { normalizePlate } from "../notice/template";

export const MAX_PHOTOS = 4;
export const MAX_PHOTO_BYTES = 1_500_000;
export const MAX_DESCRIPTION_LENGTH = 1_000;

export interface Analysis {
  /** Registration plate as written on the vehicle, `null` when not readable. */
  plate: string | null;
  /** Make, model and colour, e.g. "Škoda Octavia, stříbrná". */
  vehicle: string | null;
  offense: OffenseId | null;
  /** Factual description of what the photos show, in the register of an official notice. */
  details: string | null;
  /** Street name, house number or landmark visible in the photos. */
  placeHint: string | null;
  /** Short notes for the user, e.g. "Registrační značka není čitelná." */
  warnings: string[];
}

const UNKNOWN = "nezjisteno";

/** JSON Schema passed to the model as `responseJsonSchema`. Empty strings mean "unknown". */
export const analysisJsonSchema = {
  type: "object",
  properties: {
    plate: {
      type: "string",
      description:
        "Registrační značka přesně tak, jak je čitelná na tabulce (velká písmena, číslice, mezera jako na tabulce). Prázdný řetězec, pokud není čitelná celá.",
    },
    vehicle: {
      type: "string",
      description: "Tovární značka, model a barva vozidla česky, např. „Škoda Octavia, stříbrná“. Prázdný řetězec, pokud nejde poznat.",
    },
    offense: {
      type: "string",
      enum: [...OFFENSES.map((o) => o.id), UNKNOWN],
      description: `Nejlépe odpovídající druh přestupku. „${UNKNOWN}“, pokud z fotek ani popisu nejde určit.`,
    },
    details: {
      type: "string",
      description:
        "1–3 věcné věty česky ve stylu úředního podnětu: co je na fotkách vidět a dokládá přestupek. Bez domněnek, bez opakování obecného popisu přestupku. Prázdný řetězec, pokud nic nepřidává.",
    },
    placeHint: {
      type: "string",
      description: "Název ulice, číslo domu nebo jiný orientační bod čitelný na fotkách. Prázdný řetězec, pokud není nic vidět.",
    },
    warnings: {
      type: "array",
      items: { type: "string" },
      maxItems: 3,
      description: "Nejvýš 3 krátká upozornění česky, co na fotkách chybí pro podnět (např. nečitelná značka, není vidět dopravní značka).",
    },
  },
  required: ["plate", "vehicle", "offense", "details", "placeHint", "warnings"],
} as const;

const offenseIds = new Set<string>(OFFENSES.map((o) => o.id));

function text(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function plate(value: unknown): string | null {
  const raw = text(value, 20);
  if (!raw) return null;
  const normalized = normalizePlate(raw);
  // Letters (incl. foreign ones), digits, spaces and hyphens; anything else is not a plate
  return /^[\p{L}\p{N}][\p{L}\p{N} -]{1,11}$/u.test(normalized) ? normalized : null;
}

/** Validates the model output. Throws when it is not the expected JSON object. */
export function parseAnalysis(raw: string): Analysis {
  const data: unknown = JSON.parse(raw);
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error("Analysis is not an object");
  }
  const d = data as Record<string, unknown>;
  const offense = typeof d.offense === "string" && offenseIds.has(d.offense) ? (d.offense as OffenseId) : null;
  const details = text(d.details, 600);

  return {
    plate: plate(d.plate),
    vehicle: text(d.vehicle, 80),
    // "jine" without a description would leave the user with an unfinished form
    offense: offense === "jine" && !details ? null : offense,
    details,
    placeHint: text(d.placeHint, 120),
    warnings: Array.isArray(d.warnings)
      ? d.warnings
          .map((w) => text(w, 200))
          .filter((w): w is string => w !== null)
          .slice(0, 3)
      : [],
  };
}
