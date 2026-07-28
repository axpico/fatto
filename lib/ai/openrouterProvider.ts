import { z } from "zod";
import { env } from "@/lib/env";
import type { VisionImage } from "@/lib/ai/visionImage";

const MODELS_URL = "https://openrouter.ai/api/v1/models";
const CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODELS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const NEGATIVE_CACHE_TTL_MS = 10 * 60 * 1000;

export class OpenRouterAuthError extends Error {}

interface OpenRouterModel {
  id: string;
  pricing: { prompt: string; completion: string };
  context_length: number;
  created: number;
  supported_parameters?: string[];
  architecture?: { input_modalities?: string[] };
}

// ponytail: cache in memoria a livello di modulo, non sopravvive a un riavvio del container —
// upgrade a una tabella/KV solo se servirà persistenza tra restart (non il caso qui)
let cachedModels: OpenRouterModel[] | null = null;
let cachedAt = 0;
const negativeCache = new Map<string, number>();

export function rankFreeModels(models: OpenRouterModel[], opts?: { vision?: boolean }): string[] {
  return models
    .filter((m) => m.pricing.prompt === "0" && m.pricing.completion === "0")
    .filter((m) => m.supported_parameters?.includes("structured_outputs"))
    .filter((m) => !opts?.vision || (m.architecture?.input_modalities?.includes("image") ?? false))
    .sort((a, b) => b.context_length - a.context_length || b.created - a.created)
    .map((m) => m.id);
}

async function getModels(): Promise<OpenRouterModel[]> {
  if (cachedModels && Date.now() - cachedAt < MODELS_CACHE_TTL_MS) {
    return cachedModels;
  }

  const res = await fetch(MODELS_URL);
  if (!res.ok) throw new Error(`OpenRouter /models: HTTP ${res.status}`);
  const body = (await res.json()) as { data: OpenRouterModel[] };

  cachedModels = body.data;
  cachedAt = Date.now();
  return cachedModels;
}

export async function getFreeModelIds(opts?: { vision?: boolean }): Promise<string[]> {
  return rankFreeModels(await getModels(), opts);
}

export function isRecentlyFailed(modelId: string): boolean {
  const failedAt = negativeCache.get(modelId);
  return failedAt !== undefined && Date.now() - failedAt < NEGATIVE_CACHE_TTL_MS;
}

export function markFailed(modelId: string): void {
  negativeCache.set(modelId, Date.now());
}

export function parseJsonResponse<T>(content: string, schema: z.ZodType<T>): T {
  const stripped = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "");

  const parsed = JSON.parse(stripped);
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`OpenRouter: risposta non conforme allo schema (${result.error.message})`);
  }
  return result.data;
}

export async function callOpenRouter<T>(
  text: string,
  modelId: string,
  systemPrompt: string,
  jsonInstructions: string,
  schema: z.ZodType<T>,
  images?: VisionImage[],
): Promise<T> {
  const userContent = images?.length
    ? [
        { type: "text", text },
        ...images.map((img) => ({
          type: "image_url",
          image_url: { url: `data:${img.mediaType};base64,${img.data.toString("base64")}` },
        })),
      ]
    : text;

  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: `${systemPrompt}\n\n${jsonInstructions}` },
        { role: "user", content: userContent },
      ],
      // niente strict: true — lo schema può avere minItems (es. tags.min(1)), non supportato in
      // strict mode. Resta comunque un forte suggerimento; safeParse sotto è l'enforcement vero
      response_format: {
        type: "json_schema",
        json_schema: { name: "response", schema: z.toJSONSchema(schema) },
      },
    }),
    signal: AbortSignal.timeout(40000),
  });

  if (res.status === 401) {
    throw new OpenRouterAuthError("OpenRouter: chiave API non valida");
  }
  if (!res.ok) {
    throw new Error(`OpenRouter ${modelId}: HTTP ${res.status}`);
  }

  const body = await res.json();
  const content: string | undefined = body?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`OpenRouter ${modelId}: risposta vuota`);
  }

  return parseJsonResponse(content, schema);
}
