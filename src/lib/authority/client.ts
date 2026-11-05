import { identifyArea } from "../cuzk";
import type { LatLon } from "../photos/metadata";
import { createAuthorityIndex, findAuthority, type AuthorityIndex, type AuthorityMatch } from "./lookup";
import type { AuthorityDataset } from "./types";

export const DATASET_URL = "/data/authorities.json";

let indexPromise: Promise<AuthorityIndex> | null = null;

/** Authority data (~300 kB gzip) is downloaded once and only when needed. */
export function loadAuthorityIndex(): Promise<AuthorityIndex> {
  indexPromise ??= fetch(DATASET_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`Nepodařilo se načíst data úřadů (HTTP ${res.status})`);
      return res.json() as Promise<AuthorityDataset>;
    })
    .then(createAuthorityIndex)
    .catch((error) => {
      indexPromise = null;
      throw error;
    });
  return indexPromise;
}

export interface ResolvedAuthority {
  match: AuthorityMatch | null;
  /** Result verified against the unsimplified ČÚZK boundaries. */
  verifiedOnline: boolean;
}

/**
 * Finds the authority locally. For a point near a boundary (or outside the simplified boundaries)
 * asks ČÚZK; if ČÚZK is unavailable, returns the local result with a flag.
 */
export async function resolveAuthority(
  index: AuthorityIndex,
  point: LatLon,
  signal?: AbortSignal,
): Promise<ResolvedAuthority> {
  const local = findAuthority(index, point);
  if (local && !local.nearBoundary) return { match: local, verifiedOnline: false };

  let areaId: string | null;
  try {
    areaId = await identifyArea(point, signal);
  } catch (error) {
    if (signal?.aborted) throw error;
    return { match: local, verifiedOnline: false };
  }

  if (areaId === null) return { match: null, verifiedOnline: true };
  const authority = index.dataset.authorities[areaId];
  const area = index.areas.find((a) => a.properties.id === areaId)?.properties;
  if (!authority || !area) return { match: local, verifiedOnline: false };

  return {
    match: { area, authority, distanceToBoundaryMeters: local?.distanceToBoundaryMeters ?? 0, nearBoundary: false },
    verifiedOnline: true,
  };
}
