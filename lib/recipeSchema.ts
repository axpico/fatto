import { z } from "zod";

export const ingredientInputSchema = z.object({
  name: z.string().trim().min(1),
  quantity: z.number().positive().nullable(),
  unit: z.string().trim().min(1).nullable(),
});

export const stepInputSchema = z.object({
  instruction: z.string().trim().min(1),
  timerMinutes: z.number().int().positive().nullable(),
});

export const recipeInputSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().nullable(),
  servingsBase: z.number().int().positive(),
  prepTimeMinutes: z.number().int().positive().nullable(),
  cookTimeMinutes: z.number().int().positive().nullable(),
  sourceUrl: z.string().trim().url().nullable(),
  ingredients: z.array(ingredientInputSchema),
  steps: z.array(stepInputSchema),
  tags: z.array(z.string().trim().min(1)),
});

export type RecipeInput = z.infer<typeof recipeInputSchema>;
