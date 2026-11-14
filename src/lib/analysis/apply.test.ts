import { describe, expect, it } from "vitest";
import { applyAnalysis, emptyVehicleForm, type VehicleField } from "./apply";
import type { Analysis } from "./schema";

const analysis: Analysis = {
  plate: "1AB 2345",
  vehicle: "Škoda Octavia, stříbrná",
  offense: "chodnik",
  details: "Vozidlo stálo na chodníku.",
  placeHint: null,
  warnings: [],
};

const none = new Set<VehicleField>();

describe("applyAnalysis", () => {
  it("fills an empty form and marks everything as suggested", () => {
    const result = applyAnalysis(emptyVehicleForm, none, analysis);
    expect(result.form).toEqual({
      plate: "1AB 2345",
      vehicle: "Škoda Octavia, stříbrná",
      offense: "chodnik",
      details: "Vozidlo stálo na chodníku.",
    });
    expect([...result.suggested].sort()).toEqual(["details", "offense", "plate", "vehicle"]);
    expect(result.changed).toEqual(["plate", "vehicle", "offense", "details"]);
  });

  it("never overwrites what the user typed", () => {
    const form = { ...emptyVehicleForm, plate: "9Z9 9999", offense: "prechod" as const };
    const result = applyAnalysis(form, none, analysis);
    expect(result.form.plate).toBe("9Z9 9999");
    expect(result.form.offense).toBe("prechod");
    expect(result.suggested.has("plate")).toBe(false);
    expect(result.changed).toEqual(["vehicle", "details"]);
  });

  it("replaces an earlier untouched suggestion", () => {
    const first = applyAnalysis(emptyVehicleForm, none, analysis);
    const second = applyAnalysis(first.form, first.suggested, { ...analysis, plate: "1AB 2346" });
    expect(second.form.plate).toBe("1AB 2346");
    expect(second.changed).toEqual(["plate"]);
  });

  it("keeps the current value when the AI has nothing", () => {
    const first = applyAnalysis(emptyVehicleForm, none, analysis);
    const second = applyAnalysis(first.form, first.suggested, { ...analysis, plate: null });
    expect(second.form.plate).toBe("1AB 2345");
    expect(second.changed).toEqual([]);
  });

  it("treats a whitespace-only field as empty", () => {
    const result = applyAnalysis({ ...emptyVehicleForm, vehicle: "  " }, none, analysis);
    expect(result.form.vehicle).toBe("Škoda Octavia, stříbrná");
  });
});
