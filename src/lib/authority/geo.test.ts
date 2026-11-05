import { describe, expect, it } from "vitest";
import { bboxOf, distanceToBoundaryMeters, pointInGeometry, type AreaGeometry } from "./geo";

// a 0.1° × 0.1° square around Prague with a hole in the middle
const square: AreaGeometry = {
  type: "Polygon",
  coordinates: [
    [
      [14.4, 50.0],
      [14.5, 50.0],
      [14.5, 50.1],
      [14.4, 50.1],
      [14.4, 50.0],
    ],
    [
      [14.44, 50.04],
      [14.46, 50.04],
      [14.46, 50.06],
      [14.44, 50.06],
      [14.44, 50.04],
    ],
  ],
};

describe("pointInGeometry", () => {
  it("point inside a polygon", () => {
    expect(pointInGeometry([14.41, 50.01], square)).toBe(true);
  });

  it("bod mimo polygon", () => {
    expect(pointInGeometry([14.6, 50.05], square)).toBe(false);
  });

  it("point in a hole is not inside", () => {
    expect(pointInGeometry([14.45, 50.05], square)).toBe(false);
  });

  it("multipolygon – point in the second part", () => {
    const multi: AreaGeometry = {
      type: "MultiPolygon",
      coordinates: [
        [square.coordinates[0]],
        [
          [
            [15, 50],
            [15.1, 50],
            [15.1, 50.1],
            [15, 50],
          ],
        ],
      ],
    };
    expect(pointInGeometry([15.08, 50.02], multi)).toBe(true);
  });
});

describe("distanceToBoundaryMeters", () => {
  it("measures the distance to the nearest edge", () => {
    // 0.001° of latitude ≈ 111 m
    const d = distanceToBoundaryMeters([14.45, 50.001], square);
    expect(d).toBeGreaterThan(105);
    expect(d).toBeLessThan(117);
  });

  it("also counts the edge of a hole", () => {
    const d = distanceToBoundaryMeters([14.45, 50.039], square);
    expect(d).toBeLessThan(120);
  });
});

describe("bboxOf", () => {
  it("returns the bounding box of the outer ring", () => {
    expect(bboxOf(square)).toEqual([14.4, 50.0, 14.5, 50.1]);
  });
});
