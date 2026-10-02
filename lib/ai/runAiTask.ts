import { createHash } from "node:crypto";
import type { z } from "zod";
import { callAnthropic } from "@/lib/ai/anthropicProvider";
import { callGroq } from "@/lib/ai/groqProvider";
import {
  callOpenRouter,
  getFreeModelIds,
  isRecentlyFailed,
  markFailed,
  OpenRouterAuthError,
} from "@/lib/ai/openrouterProvider";
import { env } from "@/lib/env";
import type { VisionImage } from "@/lib/ai/visionImage";
import { BoundedMap } from "@/lib/boundedCache";

export class AiTaskError extends Error {}

const MSG_NON_DISPONIBILE = "Servizio AI non disponibile al momento, riprova più tardi";

type AiTaskOptions<T> = {
  systemPrompt: string;
  schema: z.ZodType<T>;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // il contenuto di una ricetta non cambia, limita solo la staleness
const CACHE_MAX_ENTRIES = 500;
const resultCache = new BoundedMap<string, { result: unknown; provider: string; cachedAt: number }>(
  CACHE_MAX_ENTRIES,
);

function cacheKey(input: string, opts: AiTaskOptions<unknown>, images?: VisionImage[]): string {
  const hash = createHash("sha256").update(opts.systemPrompt + input);
  for (const img of images ?? []) hash.update(img.mediaType).update(img.data);
  return hash.digest("hex");
}

/** Anthropic con vision, poi in parallelo i modelli gratuiti OpenRouter che supportano immagini
 * (vince il primo che risponde). Groq non ha supporto immagini e viene saltato del tutto. */
async function runVisionChain<T>(
  input: string,
  opts: AiTaskOptions<T>,
  images: VisionImage[],
): Promise<{ result: T; provider: string }> {
  let lastError: unknown;

  if (env.ANTHROPIC_API_KEY) {
    try {
      const result = await callAnthropic(input, opts.systemPrompt, opts.schema, images);
      console.log("[ai] vision servita da anthropic");
      return { result, provider: "anthropic" };
    } catch (err) {
      console.error("[ai] anthropic (vision) fallito:", err);
      lastError = err;
    }
  }

  if (!env.OPENROUTER_API_KEY) {
    throw lastError ?? new Error("nessun provider vision configurato");
  }

  return raceOpenRouter(input, opts, images);
}

/** Catena testuale esistente: Anthropic, poi Groq, poi in parallelo i modelli gratuiti OpenRouter. */
async function runTextChain<T>(input: string, opts: AiTaskOptions<T>): Promise<{ result: T; provider: string }> {
  if (env.ANTHROPIC_API_KEY) {
    try {
      const result = await callAnthropic(input, opts.systemPrompt, opts.schema);
      console.log("[ai] servito da anthropic");
      return { result, provider: "anthropic" };
    } catch (err) {
      console.error("[ai] anthropic fallito:", err);
    }
  }

  if (env.GROQ_API_KEY) {
    try {
      const result = await callGroq(input, opts.systemPrompt, opts.schema);
      console.log("[ai] servito da groq");
      return { result, provider: "groq" };
    } catch (err) {
      console.error("[ai] groq fallito:", err);
    }
  }

  if (!env.OPENROUTER_API_KEY) {
    throw new AiTaskError(MSG_NON_DISPONIBILE);
  }

  try {
    return await raceOpenRouter(input, opts);
  } catch {
    // ogni tentativo ha già loggato il proprio errore: qui basta un messaggio stabile per l'utente
    throw new AiTaskError(MSG_NON_DISPONIBILE);
  }
}

/** Tutti i modelli gratuiti OpenRouter (con vision se ci sono immagini) in parallelo, vince il primo. */
async function raceOpenRouter<T>(
  input: string,
  opts: AiTaskOptions<T>,
  images?: VisionImage[],
): Promise<{ result: T; provider: string }> {
  const vision = !!images?.length;
  const models = env.OPENROUTER_MODEL_OVERRIDE ? [env.OPENROUTER_MODEL_OVERRIDE] : await getFreeModelIds({ vision });
  if (models.length === 0) {
    throw new Error(`nessun modello gratuito${vision ? " con supporto immagini" : ""} disponibile`);
  }
  const recentlyOk = models.filter((modelId) => !isRecentlyFailed(modelId));
  // se sono tutti in cooldown (falliti di recente), ritenta comunque tutti: sono gratuiti, meglio
  // un altro tentativo che fallire subito riesumando l'errore stantio di un provider precedente
  const candidates = recentlyOk.length > 0 ? recentlyOk : models;

  // ponytail: modelli gratuiti, nessun costo per token — non vale la complessità di annullare i
  // tentativi perdenti (AbortController condiviso), li si lascia semplicemente terminare in background
  const attempts = candidates.map((modelId) =>
    callOpenRouter(input, modelId, opts.systemPrompt, opts.schema, images)
      .then((result) => ({ result, provider: `openrouter:${modelId}` }))
      .catch((err) => {
        console.error(`[ai] openrouter ${modelId}${vision ? " (vision)" : ""} fallito:`, err);
        if (!(err instanceof OpenRouterAuthError)) markFailed(modelId);
        throw err;
      }),
  );
  return Promise.any(attempts);
}

/** Orchestratore condiviso: se ci sono immagini prova prima la catena vision (Anthropic → OpenRouter
 * vision-capable), poi ricade silenziosamente sulla catena testuale esistente se fallisce/non è
 * disponibile — l'import non deve mai bloccarsi per una modalità in più. Usato sia dall'estrazione
 * ricette che dalla traduzione (quest'ultima senza immagini). */
export async function runAiTask<T>(
  input: string,
  opts: AiTaskOptions<T>,
  images?: VisionImage[],
): Promise<{ result: T; provider: string }> {
  const key = cacheKey(input, opts, images);
  const cached = resultCache.get(key);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    console.log(`[ai] cache hit (${cached.provider})`);
    return { result: cached.result as T, provider: cached.provider };
  }

  if (images?.length) {
    try {
      const task = await runVisionChain(input, opts, images);
      resultCache.set(key, { ...task, cachedAt: Date.now() });
      return task;
    } catch (err) {
      console.error("[ai] catena vision esaurita, fallback silenzioso a solo testo:", err);
    }
  }

  const task = await runTextChain(input, opts);
  resultCache.set(key, { ...task, cachedAt: Date.now() });
  return task;
}
