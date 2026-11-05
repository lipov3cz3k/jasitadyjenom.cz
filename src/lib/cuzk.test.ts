import { afterEach, describe, expect, it, vi } from "vitest";
import { identifyArea, reverseGeocode } from "./cuzk";

const respond = (body: unknown, status = 200) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reverseGeocode", () => {
  it("returns the address and sends coordinates rounded to 5 decimal places", async () => {
    const fetch = respond({ address: { Address: "Staroměstské náměstí 606/12, Staré Město, 11000 Praha 1" } });
    vi.stubGlobal("fetch", fetch);

    expect(await reverseGeocode({ lat: 50.087512345, lon: 14.421298765 })).toBe(
      "Staroměstské náměstí 606/12, Staré Město, 11000 Praha 1",
    );
    const url = new URL(fetch.mock.calls[0][0]);
    expect(JSON.parse(url.searchParams.get("location")!)).toEqual({
      x: 14.4213,
      y: 50.08751,
      spatialReference: { wkid: 4326 },
    });
  });

  it("returns null when there is no address nearby", async () => {
    vi.stubGlobal("fetch", respond({ error: { code: 400, message: "Unable to find address" } }));
    expect(await reverseGeocode({ lat: 49.5, lon: 15.5 })).toBeNull();
  });

  it("chyba HTTP → null", async () => {
    vi.stubGlobal("fetch", respond({}, 500));
    expect(await reverseGeocode({ lat: 49.5, lon: 15.5 })).toBeNull();
  });
});

describe("identifyArea", () => {
  it("prefers the administrative district in Prague", async () => {
    vi.stubGlobal(
      "fetch",
      respond({
        results: [
          { layerId: 14, attributes: { "Kód ORP": "19" } },
          { layerId: 10, attributes: { "Kód správního obvodu": "108" } },
        ],
      }),
    );
    expect(await identifyArea({ lat: 50.07, lon: 14.46 })).toBe("praha-so:108");
  });

  it("returns the ORP outside Prague", async () => {
    vi.stubGlobal("fetch", respond({ results: [{ layerId: 14, attributes: { "Kód ORP": "51" } }] }));
    expect(await identifyArea({ lat: 49.96, lon: 14.07 })).toBe("orp:51");
  });

  it("outside Czechia → null", async () => {
    vi.stubGlobal("fetch", respond({ results: [] }));
    expect(await identifyArea({ lat: 48.2, lon: 16.37 })).toBeNull();
  });
});
