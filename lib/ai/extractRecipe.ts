import type { ExtractedRecipe } from "@/lib/ai/schema";
import { callAnthropic } from "@/lib/ai/anthropicProvider";
import {
  callOpenRouter,
  getFreeModelIds,
  isRecentlyFailed,
  markFailed,
  OpenRouterAuthError,
} from "@/lib/ai/openrouterProvider";
import { env } from "@/lib/env";

export class AiExtractionError extends Error {}

const MSG_NON_DISPONIBILE =
  "Import AI non disponibile al momento, riprova più tardi o inserisci la ricetta manualmente";

export async function extractRecipe(rawText: string): Promise<ExtractedRecipe> {
  const trimmed = rawText.trim();
  if (trimmed.length < 30) {
    throw new AiExtractionError("Testo insufficiente per estrarre una ricetta");
  }

  if (env.ANTHROPIC_API_KEY) {
    try {
      const result = await callAnthropic(trimmed);
      console.log("[ai] servito da anthropic");
      return result;
    } catch (err) {
      console.error("[ai] anthropic fallito:", err);
    }
  }

  if (!env.OPENROUTER_API_KEY) {
    throw new AiExtractionError(MSG_NON_DISPONIBILE);
  }

  const models = env.OPENROUTER_MODEL_OVERRIDE
    ? [env.OPENROUTER_MODEL_OVERRIDE]
    : await getFreeModelIds();

  for (const modelId of models) {
    if (isRecentlyFailed(modelId)) continue;
    try {
      const result = await callOpenRouter(trimmed, modelId);
      console.log(`[ai] servito da openrouter:${modelId}`);
      return result;
    } catch (err) {
      if (err instanceof OpenRouterAuthError) {
        console.error("[ai] openrouter chiave non valida, interrompo il fallback");
        break;
      }
      console.error(`[ai] openrouter ${modelId} fallito:`, err);
      markFailed(modelId);
    }
  }

  throw new AiExtractionError(MSG_NON_DISPONIBILE);
}
