import { describe, expect, it } from "vitest";
import { OFFENSES } from "../notice/offenses";
import { analysisJsonSchema, parseAnalysis } from "./schema";

const valid = {
  plate: "1ab 2345",
  vehicle: "Škoda Octavia, stříbrná",
  offense: "chodnik",
  details: "Vozidlo stálo celou šířkou na chodníku.",
  placeHint: "Vinohradská 12",
  warnings: ["Není vidět dopravní značka."],
};

describe("parseAnalysis", () => {
  it("accepts a valid answer and normalises the plate", () => {
    expect(parseAnalysis(JSON.stringify(valid))).toEqual({ ...valid, plate: "1AB 2345" });
  });

  it("maps empty strings and the unknown offense to null", () => {
    const result = parseAnalysis(
      JSON.stringify({ plate: "", vehicle: "  ", offense: "nezjisteno", details: "", placeHint: "", warnings: [] }),
    );
    expect(result).toEqual({ plate: null, vehicle: null, offense: null, details: null, placeHint: null, warnings: [] });
  });

  it("rejects an offense outside the catalogue", () => {
    expect(parseAnalysis(JSON.stringify({ ...valid, offense: "rychlost" })).offense).toBeNull();
  });

  it("drops 'jine' without a description", () => {
    expect(parseAnalysis(JSON.stringify({ ...valid, offense: "jine", details: "" })).offense).toBeNull();
    expect(parseAnalysis(JSON.stringify({ ...valid, offense: "jine" })).offense).toBe("jine");
  });

  it("keeps foreign plates but rejects things that are not plates", () => {
    expect(parseAnalysis(JSON.stringify({ ...valid, plate: "W-12345X" })).plate).toBe("W-12345X");
    expect(parseAnalysis(JSON.stringify({ ...valid, plate: "<script>" })).plate).toBeNull();
    expect(parseAnalysis(JSON.stringify({ ...valid, plate: "1AB 2345 nebo 1AB 2346" })).plate).toBeNull();
  });

  it("caps lengths and the number of warnings", () => {
    const result = parseAnalysis(
      JSON.stringify({ ...valid, vehicle: "x".repeat(500), warnings: ["a", "b", "c", "d", 5, null] }),
    );
    expect(result.vehicle).toHaveLength(80);
    expect(result.warnings).toEqual(["a", "b", "c"]);
  });

  it("tolerates missing fields", () => {
    expect(parseAnalysis("{}")).toEqual({
      plate: null,
      vehicle: null,
      offense: null,
      details: null,
      placeHint: null,
      warnings: [],
    });
  });

  it("throws on output that is not a JSON object", () => {
    expect(() => parseAnalysis("not json")).toThrow();
    expect(() => parseAnalysis("[]")).toThrow();
    expect(() => parseAnalysis("null")).toThrow();
  });
});

describe("analysisJsonSchema", () => {
  it("offers every offense from the catalogue", () => {
    for (const o of OFFENSES) expect(analysisJsonSchema.properties.offense.enum).toContain(o.id);
  });
});
