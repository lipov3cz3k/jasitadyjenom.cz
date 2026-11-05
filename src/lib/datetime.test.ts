import { describe, expect, it } from "vitest";
import { fromDateTimeLocal, toDateTimeLocal } from "./datetime";

describe("datetime-local", () => {
  it("round trip keeps the minutes", () => {
    const d = new Date(2026, 10, 5, 7, 3, 59);
    expect(toDateTimeLocal(d)).toBe("2026-11-05T07:03");
    expect(fromDateTimeLocal(toDateTimeLocal(d))).toEqual(new Date(2026, 10, 5, 7, 3));
  });

  it("invalid value → null", () => {
    expect(fromDateTimeLocal("")).toBeNull();
    expect(fromDateTimeLocal("2026-13-45T99:99")).toBeNull();
  });
});
