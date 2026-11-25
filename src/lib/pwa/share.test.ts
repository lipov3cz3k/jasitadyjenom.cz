import { describe, expect, it } from "vitest";
import { canShareFiles, noticeFile, shareableAttachments, shareFiles } from "./share";

const photo = new File(["x"], "a.jpg", { type: "image/jpeg" });

describe("noticeFile", () => {
  it("is named after the plate and starts with a BOM", async () => {
    const file = noticeFile("Podnět", "1AB 23-45");
    expect(file.name).toBe("podnet-RZ-1AB2345.txt");
    expect(file.type).toContain("text/plain");
    const bytes = new Uint8Array(await file.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it("has a name even without a plate", () => {
    expect(noticeFile("x", " ").name).toBe("podnet-RZ-bez-RZ.txt");
  });
});

describe("canShareFiles", () => {
  const share = async () => {};

  it("needs both share and canShare", () => {
    expect(canShareFiles([photo], undefined)).toBe(false);
    expect(canShareFiles([photo], { share })).toBe(false);
    expect(canShareFiles([photo], { share, canShare: () => true })).toBe(true);
  });

  it("respects canShare and survives it throwing", () => {
    expect(canShareFiles([photo], { share, canShare: () => false })).toBe(false);
    expect(
      canShareFiles([photo], {
        share,
        canShare: () => {
          throw new TypeError("nope");
        },
      }),
    ).toBe(false);
  });

  it("is false for no files", () => {
    expect(canShareFiles([], { share, canShare: () => true })).toBe(false);
  });
});

describe("shareableAttachments", () => {
  const share = async () => {};
  const notice = noticeFile("x", "1AB2345");

  it("shares photos with the notice when allowed", () => {
    expect(shareableAttachments([photo], notice, { share, canShare: () => true })).toEqual({
      files: [photo, notice],
      withNotice: true,
    });
  });

  it("drops the text file when the browser refuses it", () => {
    const canShare = (data?: ShareData) => !data?.files?.some((f) => f.type.startsWith("text/"));
    expect(shareableAttachments([photo], notice, { share, canShare })).toEqual({ files: [photo], withNotice: false });
  });

  it("is null when files can't be shared", () => {
    expect(shareableAttachments([photo], notice, { share, canShare: () => false })).toBeNull();
    expect(shareableAttachments([], notice, { share, canShare: () => true })?.files).toEqual([notice]);
  });
});

describe("shareFiles", () => {
  it("tells a closed share sheet from a failure", async () => {
    expect(await shareFiles([photo], "t", { share: async () => {} })).toBe("shared");
    const abort = Object.assign(new Error("closed"), { name: "AbortError" });
    expect(await shareFiles([photo], "t", { share: () => Promise.reject(abort) })).toBe("cancelled");
    expect(await shareFiles([photo], "t", { share: () => Promise.reject(new Error("NotAllowed")) })).toBe("failed");
  });
});
