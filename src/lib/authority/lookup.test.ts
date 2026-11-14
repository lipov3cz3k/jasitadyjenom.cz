import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createAuthorityIndex, findAuthority } from "./lookup";
import type { AuthorityDataset } from "./types";

const dataset = JSON.parse(
  readFileSync(new URL("../../../public/data/authorities.json", import.meta.url), "utf8"),
) as AuthorityDataset;
const index = createAuthorityIndex(dataset);

// Expected values verified with the ČÚZK identify service on the unsimplified boundaries
const cases = [
  { place: "Staroměstské náměstí", lat: 50.0875, lon: 14.4213, area: "praha-so:19", authority: "Městská část Praha 1" },
  { place: "Vršovice", lat: 50.0718, lon: 14.457, area: "praha-so:108", authority: "Městská část Praha 10" },
  { place: "Lysolaje (malá MČ ve správním obvodu Praha 6)", lat: 50.125, lon: 14.37, area: "praha-so:60", authority: "Městská část Praha 6" },
  { place: "Brno, náměstí Svobody", lat: 49.1951, lon: 16.608, area: "orp:1317", authority: "Statutární město Brno" },
  { place: "Beroun, Husovo náměstí", lat: 49.9637, lon: 14.0721, area: "orp:51", authority: "Město Beroun" },
  { place: "Ostrava, Masarykovo náměstí", lat: 49.8355, lon: 18.2925, area: "orp:1961", authority: "Statutární město Ostrava" },
  { place: "Srní (obec v ORP Sušice)", lat: 49.0866, lon: 13.4747, area: "orp:574", authority: "Město Sušice" },
  { place: "Liberec", lat: 50.7699, lon: 15.0586, area: "orp:817", authority: "Statutární město Liberec" },
];

describe("findAuthority", () => {
  it.each(cases)("$place → $authority", ({ lat, lon, area, authority }) => {
    const match = findAuthority(index, { lat, lon });
    expect(match?.area.id).toBe(area);
    expect(match?.authority.name).toBe(authority);
    expect(match?.nearBoundary).toBe(false);
  });

  it("Praha 1 and Praha 10 are different authorities", () => {
    const p1 = findAuthority(index, { lat: 50.0875, lon: 14.4213 });
    const p10 = findAuthority(index, { lat: 50.0718, lon: 14.457 });
    expect(p1?.authority.dataBoxId).not.toBe(p10?.authority.dataBoxId);
  });

  it("Brno has a verified department", () => {
    const match = findAuthority(index, { lat: 49.1951, lon: 16.608 });
    expect(match?.authority.verification).toBe("verified");
    expect(match?.authority.office).toBe("Odbor přestupků v dopravě");
  });

  it("Ostrava is flagged for verification", () => {
    expect(findAuthority(index, { lat: 49.8355, lon: 18.2925 })?.authority.verification).toBe("unverified");
  });

  it.each([
    { place: "Vídeň", lat: 48.2082, lon: 16.3738 },
    { place: "Drážďany", lat: 51.0504, lon: 13.7373 },
    { place: "Atlantik", lat: 0, lon: 0 },
  ])("mimo ČR ($place) vrací null", ({ lat, lon }) => {
    expect(findAuthority(index, { lat, lon })).toBeNull();
  });

  it("a point on the boundary of two districts gets the nearBoundary flag", () => {
    // A vertex of the Praha 1 boundary – it lies entirely within Prague, so the point belongs to some district
    const praha1 = index.areas.find((a) => a.properties.id === "praha-so:19")!;
    const ring = praha1.geometry.type === "Polygon" ? praha1.geometry.coordinates[0] : praha1.geometry.coordinates[0][0];
    const [lon, lat] = ring[Math.floor(ring.length / 2)];

    const match = findAuthority(index, { lat, lon });
    expect(match).not.toBeNull();
    expect(match?.nearBoundary).toBe(true);
  });
});

describe("dataset", () => {
  const authorities = Object.entries(dataset.authorities);

  it("contains all 205 ORPs outside Prague and 22 Prague administrative districts", () => {
    expect(index.areas.filter((a) => a.properties.kind === "orp")).toHaveLength(205);
    expect(index.areas.filter((a) => a.properties.kind === "praha-so")).toHaveLength(22);
  });

  it("every area has an authority and every authority an area", () => {
    const areaIds = new Set(index.areas.map((a) => a.properties.id));
    expect(new Set(Object.keys(dataset.authorities))).toEqual(areaIds);
  });

  it("data box IDs are valid and unique", () => {
    const ids = authorities.map(([, a]) => a.dataBoxId);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]{7}$/);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("no name is in all caps", () => {
    for (const [, a] of authorities) expect(a.name).not.toBe(a.name.toLocaleUpperCase("cs"));
  });
});
