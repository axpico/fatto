import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { translateRecipe, TranslationError } from "@/lib/ai/translateRecipe";
import { nutritionInputSchema } from "@/lib/recipeSchema";

const bodySchema = z.object({
  title: z.string(),
  description: z.string(),
  servingsBase: z.number(),
  prepTimeMinutes: z.number().nullable(),
  cookTimeMinutes: z.number().nullable(),
  sourceUrl: z.string(),
  videoUrl: z.string(),
  equipment: z.array(z.string()),
  nutrition: nutritionInputSchema,
  ingredients: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().nullable(),
      unit: z.string().nullable(),
      optional: z.boolean(),
    }),
  ),
  steps: z.array(
    z.object({
      instruction: z.string(),
      timerMinutes: z.number().nullable(),
      optional: z.boolean(),
      imageFilename: z.string().nullable(),
    }),
  ),
  tags: z.array(z.string()),
  photoUrl: z.string().nullable(),
  targetLanguage: z.string().min(1),
});

export async function POST(request: Request) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Dati non validi" }, { status: 400 });
  }
  const { targetLanguage, ...recipe } = parsed.data;

  try {
    const { result, provider } = await translateRecipe(
      {
        title: recipe.title,
        description: recipe.description || null,
        ingredientNames: recipe.ingredients.map((i) => i.name),
        stepInstructions: recipe.steps.map((s) => s.instruction),
        equipment: recipe.equipment,
        tags: recipe.tags,
      },
      targetLanguage,
    );

    return Response.json({
      ...recipe,
      title: result.title,
      description: result.description ?? recipe.description,
      ingredients: recipe.ingredients.map((ing, i) => ({
        ...ing,
        name: result.ingredientNames[i] ?? ing.name,
      })),
      steps: recipe.steps.map((step, i) => ({
        ...step,
        instruction: result.stepInstructions[i] ?? step.instruction,
      })),
      equipment: recipe.equipment.map((item, i) => result.equipment[i] ?? item),
      tags: recipe.tags.map((tag, i) => result.tags[i] ?? tag),
      provider,
    });
  } catch (err) {
    if (err instanceof TranslationError) {
      return Response.json({ error: err.message }, { status: 422 });
    }
    return Response.json({ error: "Traduzione non riuscita" }, { status: 422 });
  }
}
