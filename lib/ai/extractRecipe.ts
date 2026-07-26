import { extractedRecipeSchema, type ExtractedRecipe } from "@/lib/ai/schema";
import { SYSTEM_PROMPT, JSON_INSTRUCTIONS } from "@/lib/ai/prompt";
import { runAiTask, AiTaskError } from "@/lib/ai/runAiTask";

export class AiExtractionError extends Error {}

export type ExtractionResult = { recipe: ExtractedRecipe; provider: string };

export async function extractRecipe(rawText: string): Promise<ExtractionResult> {
  const trimmed = rawText.trim();
  if (trimmed.length < 30) {
    throw new AiExtractionError("Testo insufficiente per estrarre una ricetta");
  }

  try {
    const { result, provider } = await runAiTask(trimmed, {
      systemPrompt: SYSTEM_PROMPT,
      jsonInstructions: JSON_INSTRUCTIONS,
      schema: extractedRecipeSchema,
    });
    return { recipe: result, provider };
  } catch (err) {
    if (err instanceof AiTaskError) {
      throw new AiExtractionError(err.message);
    }
    throw err;
  }
}
