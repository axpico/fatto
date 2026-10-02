import { z } from "zod";
import { recipeInputSchema, uploadFilenameSchema, type RecipeInput } from "@/lib/recipeSchema";

function toNumberOrNull(value: FormDataEntryValue | null) {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function parseRecipeFormData(formData: FormData):
  | {
      data: RecipeInput;
      photo: File | null;
      existingPhotoUrl: string | null;
      galleryPhotos: File[];
      galleryExisting: string[];
      stepImages: (File | null)[];
    }
  | { error: string } {
  const photoEntry = formData.get("photo");
  const photo = photoEntry instanceof File && photoEntry.size > 0 ? photoEntry : null;
  const existingPhotoEntry = (formData.get("existingPhotoUrl") as string) || null;
  const galleryPhotos = formData
    .getAll("galleryPhotos")
    .filter((f): f is File => f instanceof File && f.size > 0);

  let ingredients: unknown;
  let steps: unknown;
  let tags: unknown;
  let equipment: unknown;
  let nutrition: unknown;
  let galleryExisting: unknown;
  try {
    ingredients = JSON.parse((formData.get("ingredients") as string) ?? "[]");
    steps = JSON.parse((formData.get("steps") as string) ?? "[]");
    tags = JSON.parse((formData.get("tags") as string) ?? "[]");
    equipment = JSON.parse((formData.get("equipment") as string) ?? "[]");
    nutrition = JSON.parse((formData.get("nutrition") as string) ?? "{}");
    galleryExisting = JSON.parse((formData.get("galleryExisting") as string) ?? "[]");
  } catch {
    return { error: "Ingredienti, passaggi, tag, attrezzatura o valori nutrizionali non validi" };
  }

  const parsed = recipeInputSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || null,
    servingsBase: toNumberOrNull(formData.get("servingsBase")),
    prepTimeMinutes: toNumberOrNull(formData.get("prepTimeMinutes")),
    cookTimeMinutes: toNumberOrNull(formData.get("cookTimeMinutes")),
    sourceUrl: formData.get("sourceUrl") || null,
    videoUrl: formData.get("videoUrl") || null,
    equipment,
    nutrition,
    ingredients,
    steps,
    tags,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const gallery = z.array(uploadFilenameSchema).safeParse(galleryExisting);
  const existingPhoto = uploadFilenameSchema.nullable().safeParse(existingPhotoEntry);
  if (!gallery.success || !existingPhoto.success) {
    return { error: "Galleria non valida" };
  }

  const stepImages = parsed.data.steps.map((_, i) => {
    const f = formData.get(`stepImage_${i}`);
    return f instanceof File && f.size > 0 ? f : null;
  });

  return {
    data: parsed.data,
    photo,
    existingPhotoUrl: existingPhoto.data,
    galleryPhotos,
    galleryExisting: gallery.data,
    stepImages,
  };
}
