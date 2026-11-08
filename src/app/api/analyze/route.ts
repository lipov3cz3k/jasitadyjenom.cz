import { GoogleGenAI, ThinkingLevel, type Part } from "@google/genai";
import { SYSTEM_INSTRUCTION, userPrompt } from "@/lib/analysis/prompt";
import { clientIp, RateLimiter } from "@/lib/analysis/rate-limit";
import {
  analysisJsonSchema,
  MAX_DESCRIPTION_LENGTH,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  parseAnalysis,
  type Analysis,
} from "@/lib/analysis/schema";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";
const TIMEOUT_MS = 30_000;

const limiter = new RateLimiter({
  perClient: Number(process.env.AI_LIMIT_PER_HOUR ?? 10),
  perClientWindowMs: 60 * 60 * 1000,
  global: Number(process.env.AI_LIMIT_PER_DAY ?? 500),
  globalWindowMs: 24 * 60 * 60 * 1000,
});

let client: GoogleGenAI | null | undefined;

/**
 * Vertex AI with the Cloud Run service account in production (no key, EU endpoint),
 * a Gemini API key for local development.
 */
function getClient(): GoogleGenAI | null {
  if (client !== undefined) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  if (apiKey) client = new GoogleGenAI({ apiKey });
  else if (project) client = new GoogleGenAI({ vertexai: true, project, location: process.env.GOOGLE_CLOUD_LOCATION ?? "eu" });
  else client = null;
  return client;
}

function error(status: number, message: string, headers?: HeadersInit) {
  return Response.json({ error: message }, { status, headers });
}

export async function POST(request: Request) {
  // Browsers always send Origin on POST; rejects other sites calling the endpoint from their pages
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) {
    return error(403, "Požadavek z jiného webu.");
  }

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
  if (!limit.ok) {
    return error(
      429,
      limit.scope === "client"
        ? "Rozpoznávání jste použili už mockrát. Zkuste to později, nebo vyplňte formulář ručně."
        : "Dnešní limit rozpoznávání je vyčerpaný. Vyplňte prosím formulář ručně.",
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  const parts: Part[] = await Promise.all(
    photos.map(async (p) => ({
      inlineData: { mimeType: "image/jpeg", data: Buffer.from(await p.arrayBuffer()).toString("base64") },
    })),
  );
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
