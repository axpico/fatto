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

/** Orchestratore condiviso: prova Anthropic, poi in sequenza i modelli gratuiti OpenRouter.
 * Usato sia dall'estrazione ricette che dalla traduzione — stesso fallback, prompt/schema diversi. */
export async function runAiTask<T>(input: string, opts: AiTaskOptions<T>): Promise<{ result: T; provider: string }> {
  if (env.ANTHROPIC_API_KEY) {
    try {
      const result = await callAnthropic(input, opts.systemPrompt, opts.schema);
      console.log("[ai] servito da anthropic");
      return { result, provider: "anthropic" };
    } catch (err) {
      console.error("[ai] anthropic fallito:", err);
    }
  }

  if (!env.OPENROUTER_API_KEY) {
    throw new AiTaskError(MSG_NON_DISPONIBILE);
  }

  const models = env.OPENROUTER_MODEL_OVERRIDE ? [env.OPENROUTER_MODEL_OVERRIDE] : await getFreeModelIds();

  for (const modelId of models) {
    if (isRecentlyFailed(modelId)) continue;
    try {
      const result = await callOpenRouter(input, modelId, opts.systemPrompt, opts.jsonInstructions, opts.schema);
      console.log(`[ai] servito da openrouter:${modelId}`);
      return { result, provider: `openrouter:${modelId}` };
    } catch (err) {
      if (err instanceof OpenRouterAuthError) {
        console.error("[ai] openrouter chiave non valida, interrompo il fallback");
        break;
      }
      console.error(`[ai] openrouter ${modelId} fallito:`, err);
      markFailed(modelId);
    }
  }

  throw new AiTaskError(MSG_NON_DISPONIBILE);
}
