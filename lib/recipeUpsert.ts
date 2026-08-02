import { prisma } from "@/lib/db";
import { saveUpload } from "@/lib/uploads";
import { resolveTagNames } from "@/lib/tagDedupe";
import type { RecipeInput } from "@/lib/recipeSchema";

/** Carica la cover (se sostituita), la galleria e le immagini degli step. Condiviso tra
 * POST /api/recipes e PATCH /api/recipes/[id] — l'unica differenza tra i due è il fallback
 * della cover quando non ne arriva una nuova (null alla creazione, quella esistente in modifica). */
export async function uploadRecipeImages(
  photo: File | null,
  fallbackPhotoUrl: string | null,
  galleryPhotos: File[],
  steps: RecipeInput["steps"],
  stepImages: (File | null)[],
) {
  const photoUrl = photo ? await saveUpload(photo) : fallbackPhotoUrl;
  const galleryFilenames = await Promise.all(galleryPhotos.map((f) => saveUpload(f)));
  const stepImageFilenames = await Promise.all(
    steps.map((step, i) => (stepImages[i] ? saveUpload(stepImages[i]!) : Promise.resolve(step.imageFilename))),
  );
  return { photoUrl, galleryFilenames, stepImageFilenames };
}

/** Tag dedupe + flag nutrizione presente, condivisi tra create e update della ricetta. */
export async function resolveRecipeWriteFields(data: RecipeInput) {
  const hasNutrition = Object.values(data.nutrition).some((v) => v !== null);
  const resolvedTagNames = await resolveTagNames(data.tags);
  return { hasNutrition, resolvedTagNames };
}

/** Aggiorna il catalogo ingredienti dopo il salvataggio di una ricetta (create o update). */
export async function syncIngredientCatalog(ingredients: RecipeInput["ingredients"]) {
  await prisma.ingredientCatalog.createMany({
    data: ingredients.map((i) => ({ name: i.name.trim().toLowerCase() })),
    skipDuplicates: true,
  });
}
