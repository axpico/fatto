import { z } from "zod";
import { translationSystemPrompt } from "@/lib/ai/prompt";
import { runAiTask, AiTaskError } from "@/lib/ai/runAiTask";

/** Stessa forma in ingresso (campi testuali da tradurre) e in uscita (tradotti). */
export const translationSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  ingredientNames: z.array(z.string()),
  stepInstructions: z.array(z.string()),
  equipment: z.array(z.string()),
  tags: z.array(z.string()),
});

type TranslationInput = z.infer<typeof translationSchema>;

type TranslationResult = { result: z.infer<typeof translationSchema>; provider: string };

export async function translateRecipe(input: TranslationInput, targetLanguage: string): Promise<TranslationResult> {
  const task = await runAiTask(JSON.stringify(input), {
    systemPrompt: translationSystemPrompt(targetLanguage),
    schema: translationSchema,
  });
  const { result } = task;
  if (
    result.ingredientNames.length !== input.ingredientNames.length ||
    result.stepInstructions.length !== input.stepInstructions.length ||
    result.equipment.length !== input.equipment.length ||
    result.tags.length !== input.tags.length
  ) {
    throw new AiTaskError(
      "Traduzione incompleta: il modello ha restituito un numero di elementi diverso dall'originale. Riprova.",
    );
  }
  return task;
}
