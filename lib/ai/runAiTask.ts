import { createHash } from "node:crypto";
import type { z } from "zod";
import { callAnthropic } from "@/lib/ai/anthropicProvider";
import {
  callOpenRouter,
  getFreeModelIds,
  isRecentlyFailed,
  markFailed,
  OpenRouterAuthError,
} from "@/lib/ai/openrouterProvider";
import { env } from "@/lib/env";

export class AiTaskError extends Error {}

const MSG_NON_DISPONIBILE = "Servizio AI non disponibile al momento, riprova più tardi";

export type AiTaskOptions<T> = {
  systemPrompt: string;
  jsonInstructions: string;
  schema: z.ZodType<T>;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // il contenuto di una ricetta non cambia, limita solo la staleness
// ponytail: Map in memoria mai ripulita, cresce fino al riavvio del container — accettabile per
// un deploy single-container come questo (stesso compromesso già accettato in openrouterProvider.ts)
const resultCache = new Map<string, { result: unknown; provider: string; cachedAt: number }>();

function cacheKey(input: string, opts: AiTaskOptions<unknown>): string {
  return createHash("sha256").update(opts.systemPrompt + opts.jsonInstructions + input).digest("hex");
}

/** Orchestratore condiviso: prova Anthropic, poi in sequenza i modelli gratuiti OpenRouter.
 * Usato sia dall'estrazione ricette che dalla traduzione — stesso fallback, prompt/schema diversi. */
export async function runAiTask<T>(input: string, opts: AiTaskOptions<T>): Promise<{ result: T; provider: string }> {
  const key = cacheKey(input, opts);
  const cached = resultCache.get(key);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    console.log(`[ai] cache hit (${cached.provider})`);
    return { result: cached.result as T, provider: cached.provider };
  }

  let lastError: unknown;

  if (env.ANTHROPIC_API_KEY) {
    try {
      const result = await callAnthropic(input, opts.systemPrompt, opts.schema);
      console.log("[ai] servito da anthropic");
      resultCache.set(key, { result, provider: "anthropic", cachedAt: Date.now() });
      return { result, provider: "anthropic" };
    } catch (err) {
      console.error("[ai] anthropic fallito:", err);
      lastError = err;
    }
  }

  if (!env.OPENROUTER_API_KEY) {
    throw new AiTaskError(lastError instanceof Error ? lastError.message : MSG_NON_DISPONIBILE);
  }

  const models = env.OPENROUTER_MODEL_OVERRIDE ? [env.OPENROUTER_MODEL_OVERRIDE] : await getFreeModelIds();

  for (const modelId of models) {
    if (isRecentlyFailed(modelId)) continue;
    try {
      const result = await callOpenRouter(input, modelId, opts.systemPrompt, opts.jsonInstructions, opts.schema);
      console.log(`[ai] servito da openrouter:${modelId}`);
      resultCache.set(key, { result, provider: `openrouter:${modelId}`, cachedAt: Date.now() });
      return { result, provider: `openrouter:${modelId}` };
    } catch (err) {
      lastError = err;
      if (err instanceof OpenRouterAuthError) {
        console.error("[ai] openrouter chiave non valida, interrompo il fallback");
        break;
      }
      console.error(`[ai] openrouter ${modelId} fallito:`, err);
      markFailed(modelId);
    }
  }

  throw new AiTaskError(lastError instanceof Error ? lastError.message : MSG_NON_DISPONIBILE);
}
