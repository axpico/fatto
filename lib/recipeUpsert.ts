import { prisma } from "@/lib/db";
import { deleteUpload, saveUpload } from "@/lib/uploads";
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
  // every file written by this call, so the caller can remove them if the DB write fails
  const saved: string[] = [];
  async function save(file: File) {
    const filename = await saveUpload(file);
    saved.push(filename);
    return filename;
  }
  // allSettled, not all: on a failure every sibling write must have finished before cleanup,
  // otherwise a late one would land on disk after the cleanup ran
  async function settleAll<T>(promises: Promise<T>[]): Promise<T[]> {
    const results = await Promise.allSettled(promises);
    const failed = results.find((r) => r.status === "rejected");
    if (failed) throw failed.reason;
    return results.map((r) => (r as PromiseFulfilledResult<T>).value);
  }
  try {
    const photoUrl = photo ? await save(photo) : fallbackPhotoUrl;
    const galleryFilenames = await settleAll(galleryPhotos.map(save));
    const stepImageFilenames = await settleAll(
      steps.map((step, i) => (stepImages[i] ? save(stepImages[i]!) : Promise.resolve(step.imageFilename))),
    );
    return { photoUrl, galleryFilenames, stepImageFilenames, saved };
  } catch (err) {
    await Promise.all(saved.map(deleteUpload));
    throw err;
  }
}

/** Removes files from disk unless another recipe still references them (a cover, gallery image
 * or step image can be shared, e.g. when a client re-submits filenames from another recipe). */
export async function deleteUnreferencedUploads(filenames: string[], exceptRecipeId: string) {
  if (filenames.length === 0) return;
  const notThis = { not: exceptRecipeId };
  const [covers, images, steps] = await Promise.all([
    prisma.recipe.findMany({ where: { id: notThis, photoUrl: { in: filenames } }, select: { photoUrl: true } }),
    prisma.recipeImage.findMany({ where: { recipeId: notThis, filename: { in: filenames } }, select: { filename: true } }),
    prisma.step.findMany({ where: { recipeId: notThis, imageFilename: { in: filenames } }, select: { imageFilename: true } }),
  ]);
  const shared = new Set([...covers.map((r) => r.photoUrl), ...images.map((i) => i.filename), ...steps.map((s) => s.imageFilename)]);
  await Promise.all(filenames.filter((f) => !shared.has(f)).map(deleteUpload));
}

/** Tag dedupe + flag nutrizione presente, condivisi tra create e update della ricetta. */
export async function resolveRecipeWriteFields(data: RecipeInput) {
  const hasNutrition = Object.values(data.nutrition).some((v) => v !== null);
  const resolvedTagNames = await resolveTagNames(data.tags);
  return { hasNutrition, resolvedTagNames };
}

/** Tutti i file su disco referenziati da una ricetta: cover, galleria e immagini degli step. */
export function recipeFilenames(recipe: {
  photoUrl: string | null;
  images: { filename: string }[];
  steps: { imageFilename: string | null }[];
}): string[] {
  return [recipe.photoUrl, ...recipe.images.map((img) => img.filename), ...recipe.steps.map((s) => s.imageFilename)].filter(
    (f): f is string => f != null,
  );
}

/** Cancella i tag rimasti senza ricette dopo un update/delete, così non restano nei filtri. */
export async function deleteOrphanTags() {
  await prisma.tag.deleteMany({ where: { recipes: { none: {} } } });
}
