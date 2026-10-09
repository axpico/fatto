import { z } from "zod";

/** Nome di un file in UPLOAD_DIR (generato da saveUpload): niente path, così un client non può
 * far referenziare/cancellare file fuori dalla cartella upload. */
export const uploadFilenameSchema = z.string().regex(/^[\w-]+\.(jpe?g|png|webp|gif)$/i, "Nome file non valido");

// generous caps: no real recipe gets near them, they only bound abusive payloads
const MAX_ITEMS = 200;
const shortText = z.string().trim().min(1).max(200);

const ingredientInputSchema = z.object({
  name: shortText,
  quantity: z.number().positive().nullable(),
  unit: z.string().trim().min(1).max(50).nullable(),
  optional: z.boolean(),
});

const stepInputSchema = z.object({
  instruction: z.string().trim().min(1).max(5000),
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
  title: shortText,
  description: z.string().trim().max(5000).nullable(),
  servingsBase: z.number().int().positive(),
  prepTimeMinutes: z.number().int().positive().nullable(),
  cookTimeMinutes: z.number().int().positive().nullable(),
  sourceUrl: z.string().trim().url().max(2000).nullable(),
  videoUrl: z.string().trim().url().max(2000).nullable(),
  equipment: z.array(shortText).max(MAX_ITEMS),
  nutrition: nutritionInputSchema,
  ingredients: z.array(ingredientInputSchema).max(MAX_ITEMS),
  steps: z.array(stepInputSchema).max(MAX_ITEMS),
  tags: z.array(shortText).max(MAX_ITEMS),
});

export type RecipeInput = z.infer<typeof recipeInputSchema>;
