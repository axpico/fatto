import { extractedRecipeSchema, type ExtractedRecipe } from "@/lib/ai/schema";
import { SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { runAiTask, AiTaskError } from "@/lib/ai/runAiTask";
import type { VisionImage } from "@/lib/ai/visionImage";
import { toServings } from "@/lib/ai/jsonLd";

type ExtractionResult = { recipe: ExtractedRecipe; provider: string };

export async function extractRecipe(rawText: string, images?: VisionImage[]): Promise<ExtractionResult> {
  const trimmed = rawText.trim();
  if (trimmed.length < 30 && !images?.length) {
    throw new AiTaskError("Testo insufficiente per estrarre una ricetta");
  }

  const { result, provider } = await runAiTask(trimmed, { systemPrompt: SYSTEM_PROMPT, schema: extractedRecipeSchema }, images);
  return { recipe: { ...result, servings: toServings(result.servings) }, provider };
}
