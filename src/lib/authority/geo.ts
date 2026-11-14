// Simple geometry over WGS84 coordinates [lon, lat].
// Shared by the app (authority lookup) and the data pipeline (matching authorities to areas),
// so no dependencies and only syntax Node can run directly from .ts.

export type Position = [lon: number, lat: number];
export type Ring = Position[];

export type AreaGeometry =
  | { type: "Polygon"; coordinates: Ring[] }
  | { type: "MultiPolygon"; coordinates: Ring[][] };

export type BBox = [minLon: number, minLat: number, maxLon: number, maxLat: number];

const EARTH_RADIUS_M = 6_371_000;

function polygonsOf(geometry: AreaGeometry): Ring[][] {
  return geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
}

/** Ray casting; points exactly on an edge may go either way. */
export function pointInRing([x, y]: Position, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function pointInGeometry(point: Position, geometry: AreaGeometry): boolean {
  return polygonsOf(geometry).some(
    ([outer, ...holes]) =>
      pointInRing(point, outer) && !holes.some((hole) => pointInRing(point, hole)),
  );
}

export function bboxOf(geometry: AreaGeometry): BBox {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const polygon of polygonsOf(geometry)) {
    for (const [lon, lat] of polygon[0]) {
      if (lon < minLon) minLon = lon;
      if (lat < minLat) minLat = lat;
      if (lon > maxLon) maxLon = lon;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return [minLon, minLat, maxLon, maxLat];
}

export function bboxContains([minLon, minLat, maxLon, maxLat]: BBox, [lon, lat]: Position): boolean {
  return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
}

/**
 * Shortest distance from the point to the area boundary, in metres.
 * Equidistant projection around the point – accurate enough over tens to hundreds of metres.
 */
export function distanceToBoundaryMeters([lon0, lat0]: Position, geometry: AreaGeometry): number {
  const kx = (Math.PI / 180) * EARTH_RADIUS_M * Math.cos((lat0 * Math.PI) / 180);
  const ky = (Math.PI / 180) * EARTH_RADIUS_M;
  let best = Infinity;

  for (const polygon of polygonsOf(geometry)) {
    for (const ring of polygon) {
      for (let i = 1; i < ring.length; i++) {
        const ax = (ring[i - 1][0] - lon0) * kx;
        const ay = (ring[i - 1][1] - lat0) * ky;
        const bx = (ring[i][0] - lon0) * kx;
        const by = (ring[i][1] - lat0) * ky;
        const dx = bx - ax;
        const dy = by - ay;
        const lenSq = dx * dx + dy * dy;
        const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lenSq));
        const d = Math.hypot(ax + t * dx, ay + t * dy);
        if (d < best) best = d;
      }
    }
  }
  return best;
}
