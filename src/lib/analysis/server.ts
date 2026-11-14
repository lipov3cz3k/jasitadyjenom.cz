// Server-only pieces shared by the AI endpoints: the Gemini client, one rate limit budget and request checks.

import { GoogleGenAI } from "@google/genai";
import { RateLimiter } from "./rate-limit";

export const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";
export const TIMEOUT_MS = 30_000;

// One budget for all AI endpoints, so writing the notice doesn't double the daily cost cap
export const limiter = new RateLimiter({
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
export function getClient(): GoogleGenAI | null {
  if (client !== undefined) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  if (apiKey) client = new GoogleGenAI({ apiKey });
  else if (project) client = new GoogleGenAI({ vertexai: true, project, location: process.env.GOOGLE_CLOUD_LOCATION ?? "eu" });
  else client = null;
  return client;
}

export function errorResponse(status: number, message: string, headers?: HeadersInit) {
  return Response.json({ error: message }, { status, headers });
}

/** Browsers always send Origin on POST; rejects other sites calling the endpoint from their pages. */
export function isForeignOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return Boolean(origin && new URL(origin).host !== request.headers.get("host"));
}

export function rateLimitResponse(retryAfterSeconds: number, scope: "client" | "global") {
  return errorResponse(
    429,
    scope === "client"
      ? "AI jste použili už mockrát. Zkuste to později, nebo pokračujte bez ní."
      : "Dnešní limit pro AI je vyčerpaný. Pokračujte prosím bez ní.",
    { "Retry-After": String(retryAfterSeconds) },
  );
}

export async function toInlineJpeg(photo: File) {
  return { inlineData: { mimeType: "image/jpeg", data: Buffer.from(await photo.arrayBuffer()).toString("base64") } };
}
