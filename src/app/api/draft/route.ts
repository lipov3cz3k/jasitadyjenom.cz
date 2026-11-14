import { ThinkingLevel, type Part } from "@google/genai";
import { clientIp } from "@/lib/analysis/rate-limit";
import {
  errorResponse as error,
  getClient,
  isForeignOrigin,
  limiter,
  rejectOversized,
  MODEL,
  rateLimitResponse,
  TIMEOUT_MS,
  toInlineJpeg,
} from "@/lib/analysis/server";
import { DRAFT_SYSTEM_INSTRUCTION, draftUserPrompt } from "@/lib/draft/prompt";
import { draftJsonSchema, MAX_PHOTO_BYTES, MAX_PHOTOS, parseDraft, parseFacts, type NoticeDraft } from "@/lib/draft/schema";

// Writing benefits from a stronger model than reading a plate; defaults to the same one
const DRAFT_MODEL = process.env.GEMINI_DRAFT_MODEL ?? MODEL;

export async function POST(request: Request) {
  if (isForeignOrigin(request)) return error(403, "Požadavek z jiného webu.");
  const oversized = rejectOversized(request);
  if (oversized) return oversized;

  const ai = getClient();
  if (!ai) return error(503, "Psaní textu pomocí AI teď není k dispozici.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error(400, "Neplatný požadavek.");
  }

  const facts = parseFacts(String(form.get("facts") ?? ""));
  const photos = form.getAll("photo").filter((p): p is File => p instanceof File);
  if (!facts) return error(400, "Neplatné údaje o přestupku.");
  if (photos.length > MAX_PHOTOS) return error(400, `Pošlete nejvýš ${MAX_PHOTOS} fotky.`);
  if (photos.some((p) => p.type !== "image/jpeg" || p.size > MAX_PHOTO_BYTES)) {
    return error(400, "Fotky musí být zmenšené JPEG.");
  }

  const limit = limiter.take(clientIp(request.headers));
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSeconds, limit.scope);

  const parts: Part[] = await Promise.all(photos.map(toInlineJpeg));
  parts.push({ text: draftUserPrompt(facts, photos.length) });

  let draft: NoticeDraft;
  try {
    const response = await ai.models.generateContent({
      model: DRAFT_MODEL,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: DRAFT_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseJsonSchema: draftJsonSchema,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        maxOutputTokens: 4096,
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      },
    });
    draft = parseDraft(response.text ?? "", photos.length);
  } catch (e) {
    // Log only the failure, never the photos or the description
    console.error("AI draft failed:", e instanceof Error ? e.message : e);
    return error(502, "Text se nepodařilo napsat. Zkuste to znovu, nebo použijte základní text.");
  }

  return Response.json(draft, { headers: { "Cache-Control": "no-store" } });
}
