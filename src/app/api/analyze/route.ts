import { ThinkingLevel, type Part } from "@google/genai";
import { SYSTEM_INSTRUCTION, userPrompt } from "@/lib/analysis/prompt";
import { clientIp } from "@/lib/analysis/rate-limit";
import {
  analysisJsonSchema,
  MAX_DESCRIPTION_LENGTH,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  parseAnalysis,
  type Analysis,
} from "@/lib/analysis/schema";
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

export async function POST(request: Request) {
  if (isForeignOrigin(request)) return error(403, "Požadavek z jiného webu.");
  const oversized = rejectOversized(request);
  if (oversized) return oversized;

  const ai = getClient();
  if (!ai) return error(503, "Rozpoznávání pomocí AI teď není k dispozici.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error(400, "Neplatný požadavek.");
  }

  const description = String(form.get("description") ?? "").trim();
  const photos = form.getAll("photo").filter((p): p is File => p instanceof File);
  if (description.length > MAX_DESCRIPTION_LENGTH) return error(400, "Popis je příliš dlouhý.");
  if (photos.length > MAX_PHOTOS) return error(400, `Pošlete nejvýš ${MAX_PHOTOS} fotky.`);
  if (!photos.length && !description) return error(400, "Chybí fotky i popis.");
  if (photos.some((p) => p.type !== "image/jpeg" || p.size > MAX_PHOTO_BYTES)) {
    return error(400, "Fotky musí být zmenšené JPEG.");
  }

  const limit = limiter.take(clientIp(request.headers));
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSeconds, limit.scope);

  const parts: Part[] = await Promise.all(photos.map(toInlineJpeg));
  parts.push({ text: userPrompt(description, photos.length) });

  let analysis: Analysis;
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseJsonSchema: analysisJsonSchema,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        maxOutputTokens: 2048,
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      },
    });
    analysis = parseAnalysis(response.text ?? "");
  } catch (e) {
    // Log only the failure, never the photos or the description
    console.error("AI analysis failed:", e instanceof Error ? e.message : e);
    return error(502, "Rozpoznání se nepovedlo. Zkuste to znovu, nebo vyplňte formulář ručně.");
  }

  return Response.json(analysis, { headers: { "Cache-Control": "no-store" } });
}
