import { z } from "zod";

/** Nome di un file in UPLOAD_DIR (generato da saveUpload): niente path, così un client non può
 * far referenziare/cancellare file fuori dalla cartella upload. */
export const uploadFilenameSchema = z.string().regex(/^[\w-]+\.(jpe?g|png|webp|gif)$/i, "Nome file non valido");

const ingredientInputSchema = z.object({
  name: z.string().trim().min(1),
  quantity: z.number().positive().nullable(),
  unit: z.string().trim().min(1).nullable(),
  optional: z.boolean(),
});

const stepInputSchema = z.object({
  instruction: z.string().trim().min(1),
  timerMinutes: z.number().int().positive().nullable(),
  optional: z.boolean(),
  imageFilename: uploadFilenameSchema.nullable(),
});

const nutritionInputSchema = z.object({
  caloriesKcal: z.number().nonnegative().nullable(),
  proteinG: z.number().nonnegative().nullable(),
  carbsG: z.number().nonnegative().nullable(),
  fatG: z.number().nonnegative().nullable(),
  fiberG: z.number().nonnegative().nullable(),
  sugarG: z.number().nonnegative().nullable(),
  saturatedFatG: z.number().nonnegative().nullable(),
  sodiumMg: z.number().nonnegative().nullable(),
});

export const recipeInputSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().nullable(),
  servingsBase: z.number().int().positive(),
  prepTimeMinutes: z.number().int().positive().nullable(),
  cookTimeMinutes: z.number().int().positive().nullable(),
  sourceUrl: z.string().trim().url().nullable(),
  videoUrl: z.string().trim().url().nullable(),
  equipment: z.array(z.string().trim().min(1)),
  nutrition: nutritionInputSchema,
  ingredients: z.array(ingredientInputSchema),
  steps: z.array(stepInputSchema),
  tags: z.array(z.string().trim().min(1)),
});

export type RecipeInput = z.infer<typeof recipeInputSchema>;
