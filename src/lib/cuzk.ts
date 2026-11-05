// Calls to ČÚZK (RÚIAN) services straight from the browser. The only place the app
// sends the location – for the address in the notice and to verify the authority near area boundaries.

import type { LatLon } from "./photos/metadata";

const RUIAN = "https://ags.cuzk.gov.cz/arcgis/rest/services/RUIAN";
const LAYER = { prahaSo: 10, orp: 14 } as const;

/** Rounded to ~1 m – ČÚZK doesn't need more precision. */
const round = (n: number) => Math.round(n * 1e5) / 1e5;

/** Address of the nearest address point, e.g. "Staroměstské náměstí 606/12, Staré Město, 11000 Praha 1". */
export async function reverseGeocode({ lat, lon }: LatLon, signal?: AbortSignal): Promise<string | null> {
  const location = JSON.stringify({ x: round(lon), y: round(lat), spatialReference: { wkid: 4326 } });
  const params = new URLSearchParams({ location, f: "json" });
  const res = await fetch(
    `${RUIAN}/Vyhledavaci_sluzba_nad_daty_RUIAN/MapServer/exts/GeocodeSOE/tables/1/reverseGeocode?${params}`,
    { signal },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { address?: { Address?: string } };
  return data.address?.Address?.trim() || null;
}

/**
 * Area id (`praha-so:<code>` / `orp:<code>`) based on the unsimplified ČÚZK boundaries.
 * Used to verify the local result near the boundary of two areas.
 */
export async function identifyArea({ lat, lon }: LatLon, signal?: AbortSignal): Promise<string | null> {
  const x = round(lon);
  const y = round(lat);
  const params = new URLSearchParams({
    geometry: `${x},${y}`,
    geometryType: "esriGeometryPoint",
    sr: "4326",
    layers: `all:${LAYER.prahaSo},${LAYER.orp}`,
    tolerance: "0",
    mapExtent: `${x},${y},${x + 0.001},${y + 0.001}`,
    imageDisplay: "1,1,96",
    returnGeometry: "false",
    f: "json",
  });
  const res = await fetch(`${RUIAN}/MapServer/identify?${params}`, { signal });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    results?: { layerId: number; attributes: Record<string, string> }[];
  };
  const so = data.results?.find((r) => r.layerId === LAYER.prahaSo);
  if (so) return `praha-so:${so.attributes["Kód správního obvodu"]}`;
  const orp = data.results?.find((r) => r.layerId === LAYER.orp);
  if (orp) return `orp:${orp.attributes["Kód ORP"]}`;
  return null;
}
