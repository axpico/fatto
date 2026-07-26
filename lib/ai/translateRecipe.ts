import { z } from "zod";
import { translationSystemPrompt, TRANSLATION_JSON_INSTRUCTIONS } from "@/lib/ai/prompt";
import { runAiTask, AiTaskError } from "@/lib/ai/runAiTask";

export class TranslationError extends Error {}

const translationSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  ingredientNames: z.array(z.string()),
  stepInstructions: z.array(z.string()),
});

export type TranslationInput = {
  title: string;
  description: string | null;
  ingredientNames: string[];
  stepInstructions: string[];
};

export type TranslationResult = { result: z.infer<typeof translationSchema>; provider: string };

export async function translateRecipe(input: TranslationInput, targetLanguage: string): Promise<TranslationResult> {
  try {
    return await runAiTask(JSON.stringify(input), {
      systemPrompt: translationSystemPrompt(targetLanguage),
      jsonInstructions: TRANSLATION_JSON_INSTRUCTIONS,
      schema: translationSchema,
    });
  } catch (err) {
    if (err instanceof AiTaskError) {
      throw new TranslationError(err.message);
    }
    throw err;
  }
}
