import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { AuthorityDataset } from "./types";

/** Generation date of the authority data – read at build time (pages are static). */
export function datasetGeneratedAt(): Date {
  const raw = readFileSync(join(process.cwd(), "public/data/authorities.json"), "utf8");
  return new Date((JSON.parse(raw) as AuthorityDataset).generatedAt);
}
