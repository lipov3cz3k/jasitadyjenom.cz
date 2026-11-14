// Downloads the boundaries of ORPs and Prague administrative districts (ČÚZK) and authorities with data
// boxes (RPP), matches them and writes public/data/authorities.json.
//
// Run: npm run data:update (from the repo root)

import { readFile, writeFile } from "node:fs/promises";
import mapshaper from "mapshaper";
import { pointInGeometry, type AreaGeometry } from "../../src/lib/authority/geo.ts";
import type {
  AreaProperties,
  Authority,
  AuthorityDataset,
  Verification,
} from "../../src/lib/authority/types.ts";

const ROOT = new URL("../../", import.meta.url);
const OUTPUT = new URL("public/data/authorities.json", ROOT);
const OVERRIDES = new URL("data-pipeline/overrides.json", ROOT);

const RUIAN = "https://ags.cuzk.gov.cz/arcgis/rest/services/RUIAN/MapServer";
const RPP_OVM = "https://rpp-opendata.egon.gov.cz/odrpp/datovasada/ovm.json";

const LAYER = { addressPoint: 1, momc: 8, prahaSo: 10, orp: 14 } as const;
const PRAHA_OBEC = 554782;
const PRAHA_ORP = 19;

// Boundary simplification tolerance in metres; see NEAR_BOUNDARY_METERS in lookup.ts
const SIMPLIFY_INTERVAL_M = 25;
// How many authorities may stay unmatched before the pipeline fails
const MAX_UNMATCHED = 0;

// ---------------------------------------------------------------------------
// Downloads

async function fetchJson<T>(url: string, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "jasitadyjenom.cz data-pipeline" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (error) {
      if (attempt >= attempts) throw new Error(`Stažení ${url} selhalo: ${error}`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

interface GeoJsonFeature<P> {
  type: "Feature";
  properties: P;
  geometry: AreaGeometry;
}

async function queryLayerGeoJson<P>(layer: number, outFields: string, where = "1=1") {
  const params = new URLSearchParams({ where, outFields, outSR: "4326", f: "geojson" });
  const fc = await fetchJson<{ features: GeoJsonFeature<P>[]; exceededTransferLimit?: boolean }>(
    `${RUIAN}/${layer}/query?${params}`,
  );
  if (fc.exceededTransferLimit) throw new Error(`Vrstva ${layer}: překročen limit záznamů`);
  return fc.features;
}

async function queryLayerAttributes<A>(layer: number, outFields: string, where: string) {
  const params = new URLSearchParams({ where, outFields, returnGeometry: "false", f: "json" });
  const res = await fetchJson<{ features: { attributes: A }[] }>(`${RUIAN}/${layer}/query?${params}`);
  return res.features.map((f) => f.attributes);
}

async function fetchAddressPoints(codes: string[]): Promise<Map<string, [number, number]>> {
  const result = new Map<string, [number, number]>();
  for (let i = 0; i < codes.length; i += 100) {
    const chunk = codes.slice(i, i + 100);
    const params = new URLSearchParams({
      where: `kod IN (${chunk.join(",")})`,
      outFields: "kod",
      outSR: "4326",
      f: "json",
    });
    const res = await fetchJson<{ features: { attributes: { kod: number }; geometry: { x: number; y: number } }[] }>(
      `${RUIAN}/${LAYER.addressPoint}/query?${params}`,
    );
    for (const f of res.features) result.set(String(f.attributes.kod), [f.geometry.x, f.geometry.y]);
  }
  return result;
}

// ---------------------------------------------------------------------------
// RPP – public authorities

interface Ovm {
  název: { cs: string };
  ičo: string | null;
  "datové-schránky"?: { "identifikátor-ds": string }[];
  "seznam-kategorií"?: { kategorie: string }[];
  "adresa-sídla"?: { kód: string };
  ukončení?: string;
}

const hasCategory = (ovm: Ovm, code: string) =>
  ovm["seznam-kategorií"]?.some((c) => c.kategorie === `kategorie-ovm/${code}`) ?? false;

function dataBoxOf(ovm: Ovm): string {
  const boxes = ovm["datové-schránky"] ?? [];
  if (boxes.length !== 1) throw new Error(`${ovm.název.cs}: očekávána 1 datová schránka, je ${boxes.length}`);
  return boxes[0]["identifikátor-ds"];
}

/** "Statutární město Brno" → "brno" */
const normalizeMunicipality = (name: string) =>
  name
    .replace(/^(Statutární město|Hlavní město|Město|Městys|Obec)\s+/i, "")
    .trim()
    .toLocaleLowerCase("cs");

// ---------------------------------------------------------------------------
// Manual overrides

interface Override {
  name?: string;
  dataBoxId?: string;
  office?: string;
  verification?: Verification;
  note?: string;
  source?: string;
}

async function loadOverrides(): Promise<Record<string, Override>> {
  const raw = JSON.parse(await readFile(OVERRIDES, "utf8")) as Record<string, Override | string>;
  // keys starting with "_" are comments
  return Object.fromEntries(
    Object.entries(raw).filter((e): e is [string, Override] => !e[0].startsWith("_")),
  );
}

// ---------------------------------------------------------------------------

async function main() {
  console.log("Stahuji data…");
  const [orpFeatures, soFeatures, momc, ovmData, overrides] = await Promise.all([
    queryLayerGeoJson<{ kod: number; nazev: string }>(LAYER.orp, "kod,nazev"),
    queryLayerGeoJson<{ kod: number; nazev: string; spravnimomckod: number }>(
      LAYER.prahaSo,
      "kod,nazev,spravnimomckod",
    ),
    queryLayerAttributes<{ kod: number; nazev: string }>(LAYER.momc, "kod,nazev", `obec=${PRAHA_OBEC}`),
    fetchJson<{ položky: Ovm[] }>(RPP_OVM),
    loadOverrides(),
  ]);
  const activeOvm = ovmData.položky.filter((o) => !o.ukončení);
  console.log(
    `ORP: ${orpFeatures.length}, správní obvody Prahy: ${soFeatures.length}, OVM: ${activeOvm.length}`,
  );

  const errors: string[] = [];
  const warnings: string[] = [];
  const authorities: Record<string, Authority> = {};
  const areas: GeoJsonFeature<AreaProperties>[] = [];

  // --- ORP outside Prague: ORP authority (KO11) matched by seat location ----------
  const orpOvm = activeOvm.filter((o) => hasCategory(o, "KO11"));
  const seats = await fetchAddressPoints(
    orpOvm.map((o) => o["adresa-sídla"]?.kód).filter((k): k is string => Boolean(k)),
  );
  const assigned = new Set<Ovm>();

  for (const orp of orpFeatures) {
    if (orp.properties.kod === PRAHA_ORP) continue;
    const id = `orp:${orp.properties.kod}`;
    const name = orp.properties.nazev;
    const byName = (o: Ovm) => normalizeMunicipality(o.název.cs) === normalizeMunicipality(name);

    const inside = orpOvm.filter((o) => {
      const seat = seats.get(o["adresa-sídla"]?.kód ?? "");
      return seat && pointInGeometry(seat, orp.geometry);
    });
    let ovm = inside.length === 1 ? inside[0] : inside.find(byName);
    if (!ovm) ovm = orpOvm.find((o) => byName(o) && !assigned.has(o));

    if (!ovm) {
      if (overrides[id]?.dataBoxId && overrides[id]?.name) {
        warnings.push(`${id} ${name}: úřad jen z overrides.json`);
      } else {
        errors.push(`${id} ${name}: nenalezen úřad ORP (sídel uvnitř: ${inside.length})`);
        continue;
      }
    } else {
      if (assigned.has(ovm)) errors.push(`${id} ${name}: úřad ${ovm.název.cs} už je přiřazen jinde`);
      assigned.add(ovm);
      if (!byName(ovm)) warnings.push(`${id} ${name}: název úřadu nesedí – ${ovm.název.cs}`);
    }

    authorities[id] = {
      name: ovm?.název.cs ?? "",
      dataBoxId: ovm ? dataBoxOf(ovm) : "",
      ico: ovm?.ičo ?? null,
      verification: "standard",
    };
    areas.push({ type: "Feature", properties: { id, name, kind: "orp" }, geometry: orp.geometry });
  }

  // --- Prague: district authorities Praha 1–22 by administrative district -------
  const momcName = new Map(momc.map((m) => [m.kod, m.nazev]));
  const prahaOvm = activeOvm.filter((o) => hasCategory(o, "KO132"));

  for (const so of soFeatures) {
    const id = `praha-so:${so.properties.kod}`;
    const name = so.properties.nazev;
    const adminName = momcName.get(so.properties.spravnimomckod);
    const ovm = prahaOvm.find((o) => o.název.cs === `Městská část ${adminName}`);
    if (!ovm) {
      errors.push(`${id} ${name}: nenalezena městská část ${adminName}`);
      continue;
    }
    authorities[id] = {
      name: ovm.název.cs,
      dataBoxId: dataBoxOf(ovm),
      ico: ovm.ičo,
      verification: "verified",
      note: "V Praze projednávají dopravní přestupky úřady městských částí Praha 1–22 (od 1. 7. 2024).",
    };
    areas.push({ type: "Feature", properties: { id, name, kind: "praha-so" }, geometry: so.geometry });
  }

  // --- Manual overrides ---------------------------------------------------------
  for (const [id, override] of Object.entries(overrides)) {
    if (!authorities[id]) {
      errors.push(`overrides.json: neznámé území ${id}`);
      continue;
    }
    const fields: Override = { ...override };
    delete fields.source;
    authorities[id] = { ...authorities[id], ...fields };
  }

  for (const [id, a] of Object.entries(authorities)) {
    if (!/^[a-z0-9]{7}$/.test(a.dataBoxId)) errors.push(`${id}: neplatné ID datové schránky "${a.dataBoxId}"`);
    if (a.name === a.name.toLocaleUpperCase("cs")) warnings.push(`${id}: název velkými písmeny – doplň "name" do overrides.json`);
  }
  const expectedAreas = orpFeatures.length - 1 + soFeatures.length;
  const unmatched = expectedAreas - areas.length;

  for (const w of warnings) console.warn(`⚠ ${w}`);
  for (const e of errors) console.error(`✗ ${e}`);
  if (errors.length > 0 || unmatched > MAX_UNMATCHED) {
    throw new Error(`Pipeline selhala: ${errors.length} chyb, ${unmatched} nespárovaných území`);
  }

  // --- Boundary simplification and TopoJSON -------------------------------------
  console.log(`Zjednodušuji ${areas.length} území…`);
  const output = await mapshaper.applyCommands(
    `-i areas.json -simplify interval=${SIMPLIFY_INTERVAL_M} keep-shapes ` +
      `-o areas.json format=topojson quantization=100000`,
    { "areas.json": { type: "FeatureCollection", features: areas } },
  );
  const topology = JSON.parse(String(output["areas.json"]));

  const dataset: AuthorityDataset = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sources: [
      {
        name: "Hranice ORP a správních obvodů Prahy: ČÚZK, RÚIAN",
        url: "https://cuzk.gov.cz/ruian/",
        licence: "CC BY 4.0",
      },
      {
        name: "Orgány veřejné moci a datové schránky: Registr práv a povinností",
        url: "https://rpp-opendata.egon.gov.cz/odrpp/datovasada/",
        licence: "otevřená data",
      },
    ],
    authorities: Object.fromEntries(Object.entries(authorities).sort(([a], [b]) => a.localeCompare(b))),
    areas: topology,
  };

  // If the data didn't change, leave the file alone (otherwise every run would change generatedAt)
  const previous = await readFile(OUTPUT, "utf8").then(
    (s) => JSON.parse(s) as AuthorityDataset,
    () => null,
  );
  const withoutDate = (d: AuthorityDataset) => JSON.stringify({ ...d, generatedAt: "" });
  if (previous && withoutDate(previous) === withoutDate(dataset)) {
    console.log("Data se nezměnila.");
    return;
  }

  await writeFile(OUTPUT, JSON.stringify(dataset) + "\n");
  const verificationCounts = Object.values(authorities).reduce<Record<string, number>>((acc, a) => {
    acc[a.verification] = (acc[a.verification] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`Zapsáno ${OUTPUT.pathname}: ${areas.length} území`, verificationCounts);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
