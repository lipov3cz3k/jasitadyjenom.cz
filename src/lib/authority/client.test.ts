import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAuthority } from "./client";
import { createAuthorityIndex } from "./lookup";
import type { AuthorityDataset } from "./types";

const index = createAuthorityIndex(
  JSON.parse(
    readFileSync(new URL("../../../public/data/authorities.json", import.meta.url), "utf8"),
  ) as AuthorityDataset,
);

// a vertex of the Praha 1 boundary – locally "near a boundary"
const praha1 = index.areas.find((a) => a.properties.id === "praha-so:19")!;
const ring = praha1.geometry.type === "Polygon" ? praha1.geometry.coordinates[0] : praha1.geometry.coordinates[0][0];
const [boundaryLon, boundaryLat] = ring[Math.floor(ring.length / 2)];
const onBoundary = { lat: boundaryLat, lon: boundaryLon };

const identifyResponse = (results: unknown[]) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify({ results })));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveAuthority", () => {
  it("doesn't ask ČÚZK far from a boundary", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const result = await resolveAuthority(index, { lat: 49.9637, lon: 14.0721 });
    expect(result.match?.authority.name).toBe("Město Beroun");
    expect(result.verifiedOnline).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("near a boundary uses the ČÚZK result", async () => {
    const fetch = identifyResponse([
      { layerId: 10, attributes: { "Kód správního obvodu": "27" } },
      { layerId: 14, attributes: { "Kód ORP": "19" } },
    ]);
    vi.stubGlobal("fetch", fetch);

    const result = await resolveAuthority(index, onBoundary);
    expect(fetch).toHaveBeenCalledOnce();
    expect(result.verifiedOnline).toBe(true);
    expect(result.match?.area.id).toBe("praha-so:27");
    expect(result.match?.authority.name).toBe("Městská část Praha 2");
    expect(result.match?.nearBoundary).toBe(false);
  });

  it("when ČÚZK is down, returns the local result with the boundary flag", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const result = await resolveAuthority(index, onBoundary);
    expect(result.verifiedOnline).toBe(false);
    expect(result.match?.nearBoundary).toBe(true);
  });

  it("outside Czechia according to ČÚZK → no authority", async () => {
    vi.stubGlobal("fetch", identifyResponse([]));

    const result = await resolveAuthority(index, { lat: 48.2082, lon: 16.3738 });
    expect(result).toEqual({ match: null, verifiedOnline: true });
  });
});
