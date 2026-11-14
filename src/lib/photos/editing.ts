// Heuristics that a photo is not the camera original. Metadata can be forged, so this is a hint
// for the reporter (attach the original instead), not proof either way. Only signals that a phone
// camera does not produce on its own are used, to keep false alarms rare.

export type EditHint =
  /** IPTC DigitalSourceType says the image was generated or edited by AI (Galaxy AI, Pixel Magic Editor, …). */
  | { kind: "ai" }
  /** Software / XMP CreatorTool names a photo editor. */
  | { kind: "editor"; tool: string }
  /** The file was saved again well after it was taken (EXIF DateTime later than DateTimeOriginal). */
  | { kind: "resaved"; minutesLater: number };

export interface EditingSignals {
  /** EXIF Software (IFD0). On phones it is the camera firmware or OS version. */
  software?: string;
  /** XMP xmp:CreatorTool. */
  creatorTool?: string;
  /** XMP Iptc4xmpExt:DigitalSourceType. */
  digitalSourceType?: string;
  /** Raw XMP packet, a fallback when the XMP fields could not be parsed. */
  xmpRaw?: string;
  /** EXIF DateTime (last change of the file). */
  modifiedAt?: Date | null;
  /** EXIF DateTimeOriginal. */
  takenAt?: Date | null;
}

/** Saving a photo again shortly after capture happens on some phones (e.g. HDR post-processing). */
export const RESAVED_AFTER_MINUTES = 10;

const AI_SOURCE_TYPES = /trainedAlgorithmicMedia|algorithmicMedia|compositeSynthetic/i;

const EDITORS: [RegExp, string][] = [
  [/photoshop/i, "Adobe Photoshop"],
  [/lightroom/i, "Adobe Lightroom"],
  [/adobe/i, "Adobe"],
  [/\bgimp\b/i, "GIMP"],
  [/snapseed/i, "Snapseed"],
  [/picsart/i, "PicsArt"],
  [/canva/i, "Canva"],
  [/pixelmator/i, "Pixelmator"],
  [/affinity/i, "Affinity Photo"],
  [/paint\.net/i, "Paint.NET"],
  [/photopea/i, "Photopea"],
  [/\bvsco\b/i, "VSCO"],
  [/luminar/i, "Luminar"],
  [/darktable/i, "darktable"],
  [/rawtherapee/i, "RawTherapee"],
  [/capture one/i, "Capture One"],
  [/acdsee/i, "ACDSee"],
  [/picasa/i, "Picasa"],
  [/fotor/i, "Fotor"],
  [/polarr/i, "Polarr"],
  [/facetune/i, "Facetune"],
  [/photoscape/i, "PhotoScape"],
  [/meitu/i, "Meitu"],
  [/microsoft|windows photo/i, "Microsoft Fotky"],
];

function findEditor(...values: (string | undefined)[]): string | null {
  for (const value of values) {
    if (!value) continue;
    const match = EDITORS.find(([re]) => re.test(value));
    if (match) return match[1];
  }
  return null;
}

function xmpField(raw: string | undefined, name: string): string | undefined {
  if (!raw) return undefined;
  // Either an attribute (name="…") or the first text inside the element (<name>…</name>, possibly
  // wrapped in rdf:Alt/li). The value is only matched against patterns, never rendered.
  const re = new RegExp(`${name}\\s*=\\s*"([^"]*)"|<${name}[^>]*>\\s*(?:<[^>]*>\\s*)*([^<]+)`, "i");
  const m = raw.match(re);
  return (m?.[1] ?? m?.[2])?.trim() || undefined;
}

/** Returns the strongest hint that the photo was edited, or `null` when it looks like a camera original. */
export function detectEditing(signals: EditingSignals): EditHint | null {
  const sourceType = signals.digitalSourceType ?? xmpField(signals.xmpRaw, "Iptc4xmpExt:DigitalSourceType");
  if (sourceType && AI_SOURCE_TYPES.test(sourceType)) return { kind: "ai" };

  const tool = findEditor(signals.software, signals.creatorTool ?? xmpField(signals.xmpRaw, "xmp:CreatorTool"));
  if (tool) return { kind: "editor", tool };

  const { modifiedAt, takenAt } = signals;
  if (modifiedAt && takenAt) {
    const minutesLater = Math.round((modifiedAt.getTime() - takenAt.getTime()) / 60_000);
    if (minutesLater > RESAVED_AFTER_MINUTES) return { kind: "resaved", minutesLater };
  }
  return null;
}

/** Czech description for the reporter, e.g. "upravená v programu Snapseed". */
export function describeEditHint(hint: EditHint): string {
  switch (hint.kind) {
    case "ai":
      return "obsahuje úpravy umělou inteligencí";
    case "editor":
      return `byla upravená v programu ${hint.tool}`;
    case "resaved":
      return `byla znovu uložená ${formatDelay(hint.minutesLater)} po pořízení`;
  }
}

function formatDelay(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h`;
  const days = Math.round(hours / 24);
  return `${days} ${days < 5 ? "dny" : "dní"}`;
}
