import { z } from "zod";

const nutritionSchema = z
  .object({
    calories: z.number().nullable(),
    protein_g: z.number().nullable(),
    carbs_g: z.number().nullable(),
    fat_g: z.number().nullable(),
    fiber_g: z.number().nullable(),
    sugar_g: z.number().nullable(),
    saturated_fat_g: z.number().nullable(),
    sodium_mg: z.number().nullable(),
  })
  .nullable();

export const extractedRecipeSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  tags: z.array(z.string()).min(1),
  equipment: z.array(z.string()),
  nutrition: nutritionSchema,
  servings: z.number().nullable(),
  prep_time_minutes: z.number().nullable(),
  cook_time_minutes: z.number().nullable(),
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
      timer_minutes: z.number().nullable(),
      optional: z.boolean(),
    }),
  ),
});

export type ExtractedRecipe = z.infer<typeof extractedRecipeSchema>;
