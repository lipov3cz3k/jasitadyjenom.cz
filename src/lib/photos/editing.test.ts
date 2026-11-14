import { describe, expect, it } from "vitest";
import { describeEditHint, detectEditing } from "./editing";

const taken = new Date("2026-11-13T11:58:39Z");
const later = (minutes: number) => new Date(taken.getTime() + minutes * 60_000);

describe("detectEditing", () => {
  it("camera original from a phone → null", () => {
    // Samsung Galaxy S22: Software is the firmware, DateTime equals DateTimeOriginal
    expect(detectEditing({ software: "S901BXXSOGZH3", modifiedAt: taken, takenAt: taken })).toBeNull();
    // iPhone: Software is the iOS version
    expect(detectEditing({ software: "18.1", modifiedAt: later(1), takenAt: taken })).toBeNull();
    expect(detectEditing({})).toBeNull();
  });

  it.each([
    ["Adobe Photoshop 26.0 (Windows)", "Adobe Photoshop"],
    ["Adobe Lightroom Mobile", "Adobe Lightroom"],
    ["Snapseed 2.0", "Snapseed"],
    ["GIMP 2.10.38", "GIMP"],
    ["Microsoft Windows Photo Viewer 10.0", "Microsoft Fotky"],
  ])("Software %j → editor %s", (software, tool) => {
    expect(detectEditing({ software })).toEqual({ kind: "editor", tool });
  });

  it("editor from XMP CreatorTool, parsed or raw", () => {
    expect(detectEditing({ creatorTool: "Pixelmator Pro 3.6" })).toEqual({ kind: "editor", tool: "Pixelmator" });
    expect(detectEditing({ xmpRaw: '<rdf:Description xmp:CreatorTool="Canva" />' })).toEqual({
      kind: "editor",
      tool: "Canva",
    });
    expect(detectEditing({ xmpRaw: "<xmp:CreatorTool>PicsArt</xmp:CreatorTool>" })).toEqual({
      kind: "editor",
      tool: "PicsArt",
    });
    expect(
      detectEditing({
        xmpRaw: '<xmp:CreatorTool>\n  <rdf:Alt><rdf:li xml:lang="x-default">GIMP 2.10</rdf:li></rdf:Alt>\n</xmp:CreatorTool>',
      }),
    ).toEqual({ kind: "editor", tool: "GIMP" });
  });

  it("AI edit from IPTC DigitalSourceType wins over other signals", () => {
    const ai = "http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia";
    expect(detectEditing({ digitalSourceType: ai, software: "Snapseed" })).toEqual({ kind: "ai" });
    expect(
      detectEditing({
        xmpRaw: `<rdf:Description><Iptc4xmpExt:DigitalSourceType>${ai}</Iptc4xmpExt:DigitalSourceType></rdf:Description>`,
      }),
    ).toEqual({ kind: "ai" });
  });

  it("camera capture source type is not an AI edit", () => {
    const camera = "http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture";
    expect(detectEditing({ digitalSourceType: camera })).toBeNull();
  });

  it("saved again long after capture → resaved", () => {
    expect(detectEditing({ modifiedAt: later(10), takenAt: taken })).toBeNull();
    expect(detectEditing({ modifiedAt: later(11), takenAt: taken })).toEqual({ kind: "resaved", minutesLater: 11 });
    // DateTime before DateTimeOriginal (clock change) is not an edit
    expect(detectEditing({ modifiedAt: later(-120), takenAt: taken })).toBeNull();
  });
});

describe("describeEditHint", () => {
  it.each([
    [{ kind: "ai" } as const, "obsahuje úpravy umělou inteligencí"],
    [{ kind: "editor", tool: "Snapseed" } as const, "byla upravená v programu Snapseed"],
    [{ kind: "resaved", minutesLater: 25 } as const, "byla znovu uložená 25 min po pořízení"],
    [{ kind: "resaved", minutesLater: 180 } as const, "byla znovu uložená 3 h po pořízení"],
    [{ kind: "resaved", minutesLater: 3 * 24 * 60 } as const, "byla znovu uložená 3 dny po pořízení"],
    [{ kind: "resaved", minutesLater: 7 * 24 * 60 } as const, "byla znovu uložená 7 dní po pořízení"],
  ])("%j", (hint, text) => {
    expect(describeEditHint(hint)).toBe(text);
  });
});
