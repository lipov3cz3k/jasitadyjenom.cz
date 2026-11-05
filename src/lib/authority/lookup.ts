import { feature } from "topojson-client";
import type { GeometryCollection } from "topojson-specification";
import {
  bboxContains,
  bboxOf,
  distanceToBoundaryMeters,
  pointInGeometry,
  type AreaGeometry,
  type BBox,
  type Position,
} from "./geo";
import type { AreaProperties, Authority, AuthorityDataset } from "./types";

/**
 * Boundaries are simplified (on the order of tens of metres). A point closer to a boundary
 * than this distance may actually belong to the neighbouring authority.
 */
export const NEAR_BOUNDARY_METERS = 100;

interface IndexedArea {
  properties: AreaProperties;
  geometry: AreaGeometry;
  bbox: BBox;
}

export interface AuthorityIndex {
  dataset: AuthorityDataset;
  areas: IndexedArea[];
}

export interface AuthorityMatch {
  area: AreaProperties;
  authority: Authority;
  distanceToBoundaryMeters: number;
  nearBoundary: boolean;
}

export function createAuthorityIndex(dataset: AuthorityDataset): AuthorityIndex {
  const object = dataset.areas.objects.areas as GeometryCollection<AreaProperties>;
  const collection = feature(dataset.areas, object);

  const areas = collection.features.map((f) => {
    const geometry = f.geometry as AreaGeometry;
    return { properties: f.properties, geometry, bbox: bboxOf(geometry) };
  });
  return { dataset, areas };
}

/** Finds the competent authority for a place; `null` outside Czechia (or in a gap of the simplified boundaries). */
export function findAuthority(
  index: AuthorityIndex,
  { lat, lon }: { lat: number; lon: number },
): AuthorityMatch | null {
  const point: Position = [lon, lat];

  for (const area of index.areas) {
    if (!bboxContains(area.bbox, point) || !pointInGeometry(point, area.geometry)) continue;

    const authority = index.dataset.authorities[area.properties.id];
    if (!authority) {
      throw new Error(`Území ${area.properties.id} nemá v datech úřad`);
    }
    const distance = distanceToBoundaryMeters(point, area.geometry);
    return {
      area: area.properties,
      authority,
      distanceToBoundaryMeters: distance,
      nearBoundary: distance < NEAR_BOUNDARY_METERS,
    };
  }
  return null;
}
