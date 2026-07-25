import { recipeInputSchema, type RecipeInput } from "@/lib/recipeSchema";

function toNumberOrNull(value: FormDataEntryValue | null) {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function parseRecipeFormData(
  formData: FormData,
): { data: RecipeInput; photo: File | null } | { error: string } {
  const photoEntry = formData.get("photo");
  const photo = photoEntry instanceof File && photoEntry.size > 0 ? photoEntry : null;

  let ingredients: unknown;
  let steps: unknown;
  let tags: unknown;
  try {
    ingredients = JSON.parse((formData.get("ingredients") as string) ?? "[]");
    steps = JSON.parse((formData.get("steps") as string) ?? "[]");
    tags = JSON.parse((formData.get("tags") as string) ?? "[]");
  } catch {
    return { error: "Ingredienti, passaggi o tag non validi" };
  }

  const parsed = recipeInputSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || null,
    servingsBase: toNumberOrNull(formData.get("servingsBase")),
    prepTimeMinutes: toNumberOrNull(formData.get("prepTimeMinutes")),
    cookTimeMinutes: toNumberOrNull(formData.get("cookTimeMinutes")),
    sourceUrl: formData.get("sourceUrl") || null,
    ingredients,
    steps,
    tags,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  return { data: parsed.data, photo };
}
