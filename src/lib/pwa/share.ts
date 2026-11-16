// Handing the finished notice to another app (Datovka, e-mail, Files) through the system share sheet.
// A data box message is only a subject and attachments, so we share the photos plus the notice as a .txt.

type ShareNavigator = Pick<Navigator, "share" | "canShare">;

/** The notice text as a file; the BOM keeps Czech characters readable in Windows Notepad. */
export function noticeFile(body: string, plate: string): File {
  const name = `podnet-RZ-${plate.replace(/[^0-9A-Za-z]/g, "").toUpperCase() || "bez-RZ"}.txt`;
  return new File(["﻿" + body], name, { type: "text/plain;charset=utf-8" });
}

/** Whether this browser can share these files (Chrome on Android, Safari; not Firefox or most desktops). */
export function canShareFiles(files: File[], nav: Partial<ShareNavigator> | undefined = globalThis.navigator): boolean {
  if (!files.length || typeof nav?.share !== "function" || typeof nav.canShare !== "function") return false;
  try {
    return nav.canShare({ files });
  } catch {
    return false;
  }
}

/**
 * What to put in the share sheet: photos with the notice, or only the photos where the browser
 * refuses the text file. `null` when sharing files isn't possible here at all.
 */
export function shareableAttachments(
  photos: File[],
  notice: File,
  nav: Partial<ShareNavigator> | undefined = globalThis.navigator,
): { files: File[]; withNotice: boolean } | null {
  if (canShareFiles([...photos, notice], nav)) return { files: [...photos, notice], withNotice: true };
  if (canShareFiles(photos, nav)) return { files: photos, withNotice: false };
  return null;
}

export type ShareResult = "shared" | "cancelled" | "failed";

export async function shareFiles(
  files: File[],
  title: string,
  nav: Pick<ShareNavigator, "share"> = globalThis.navigator,
): Promise<ShareResult> {
  try {
    await nav.share({ files, title });
    return "shared";
  } catch (e) {
    // AbortError: the user closed the share sheet
    return e instanceof Error && e.name === "AbortError" ? "cancelled" : "failed";
  }
}
