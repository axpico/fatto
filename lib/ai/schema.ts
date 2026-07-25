import { z } from "zod";

export const extractedRecipeSchema = z.object({
  title: z.string(),
  servings: z.number().nullable(),
  prep_time_minutes: z.number().nullable(),
  cook_time_minutes: z.number().nullable(),
  ingredients: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().nullable(),
      unit: z.string().nullable(),
    }),
  ),
  steps: z.array(
    z.object({
      instruction: z.string(),
      timer_minutes: z.number().nullable(),
    }),
  ),
});

export type ExtractedRecipe = z.infer<typeof extractedRecipeSchema>;
