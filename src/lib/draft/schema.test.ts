import { describe, expect, it } from "vitest";
import { draftUserPrompt } from "./prompt";
import { parseDraft, parseFacts } from "./schema";

const valid = {
  facts: "Vozidlo stálo na chodníku.\n\n  Řidič byl upozorněn.  ",
  harm: [{ title: "Omezení průchodu chodců:", text: "Zbyl průchod odhadem 0,8 m." }],
  captions: [
    { photo: 1, caption: "celkový pohled." },
    { photo: 2, caption: "detail" },
  ],
  warnings: ["Není vidět značka."],
};

describe("parseDraft", () => {
  it("accepts a valid answer and tidies it", () => {
    expect(parseDraft(JSON.stringify(valid), 2)).toEqual({
      facts: "Vozidlo stálo na chodníku.\n\nŘidič byl upozorněn.",
      harm: [{ title: "Omezení průchodu chodců", text: "Zbyl průchod odhadem 0,8 m." }],
      captions: [
        { photo: 1, caption: "celkový pohled" },
        { photo: 2, caption: "detail" },
      ],
      warnings: ["Není vidět značka."],
    });
  });

  it("drops sentences with times, dates or provisions instead of trusting them", () => {
    const draft = parseDraft(
      JSON.stringify({
        ...valid,
        facts: "Vozidlo stálo na chodníku. Stalo se to 15. 9. 2026 v 9:21. Porušilo § 53.",
        harm: [{ title: "Rozpor se zákonem", text: "Podle zákona č. 361/2000 Sb. je to zakázané." }, ...valid.harm],
      }),
      2,
    );
    expect(draft.facts).toBe("Vozidlo stálo na chodníku.");
    expect(draft.harm.map((h) => h.title)).toEqual(["Omezení průchodu chodců"]);
  });

  it("drops text with characters of another script", () => {
    const draft = parseDraft(
      JSON.stringify({
        ...valid,
        facts: "Vozidlo stálo na chodníku. Nebylo tudದ್ದರಿಂದ projít.",
        harm: [{ title: "Průchod", text: "Nešlo projít, tudದ್ದರಿಂದ obcházeli." }],
      }),
      2,
    );
    expect(draft.facts).toBe("Vozidlo stálo na chodníku.");
    expect(draft.harm).toEqual([]);
  });

  it("rejects captions for photos that were not sent, and duplicates", () => {
    const draft = parseDraft(
      JSON.stringify({ ...valid, captions: [{ photo: 3, caption: "x" }, { photo: 1, caption: "a" }, { photo: 1, caption: "b" }] }),
      2,
    );
    expect(draft.captions).toEqual([{ photo: 1, caption: "a" }]);
  });

  it("throws without usable facts", () => {
    expect(() => parseDraft(JSON.stringify({ ...valid, facts: "V 9:21 stálo." }), 2)).toThrow();
    expect(() => parseDraft("[]", 2)).toThrow();
  });
});

describe("parseFacts", () => {
  const facts = { offense: "chodnik", vehicle: "Iveco", details: "", description: "stojí na rohu" };

  it("accepts the form data", () => {
    expect(parseFacts(JSON.stringify(facts))).toEqual(facts);
  });

  it.each([
    ["unknown offense", { ...facts, offense: "rychlost" }],
    ["missing description", { ...facts, description: undefined }],
    ["too long", { ...facts, description: "x".repeat(5000) }],
  ])("rejects %s", (_, data) => {
    expect(parseFacts(JSON.stringify(data))).toBeNull();
  });
});

describe("draftUserPrompt", () => {
  it("tells the model when the duration doesn't matter and omits empty fields", () => {
    const prompt = draftUserPrompt(
      { offense: "chodnik", vehicle: "", details: "", description: "stojí na rohu" },
      5,
    );
    expect(prompt).toContain("(zákon zde zakazuje i zastavení)");
    expect(prompt).not.toContain("Vozidlo:");
    expect(prompt).not.toContain("Doplnění");
    expect(prompt).toContain("Přikládám 5 fotek.");
    expect(prompt).not.toContain("Řidič");
  });
});
