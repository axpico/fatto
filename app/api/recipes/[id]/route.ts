import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { deleteUpload, UploadError } from "@/lib/uploads";
import { parseRecipeFormData } from "@/lib/parseRecipeFormData";
import {
  uploadRecipeImages,
  resolveRecipeWriteFields,
  recipeFilenames,
  deleteOrphanTags,
  deleteUnreferencedUploads,
} from "@/lib/recipeUpsert";
import { findOrNotFound, type RouteParams } from "@/lib/apiRoute";

type Params = RouteParams<{ id: string }>;

// Shared editing is intentional (family cookbook): any signed-in user may edit or delete any
// recipe, not only its creator.
export async function PATCH(request: Request, { params }: Params) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const { record: existing, notFound } = await findOrNotFound(
    () => prisma.recipe.findUnique({ where: { id }, include: { images: true, nutrition: true, steps: true } }),
    "Ricetta non trovata",
  );
  if (notFound) return notFound;

  const formData = await request.formData();
  const parsed = parseRecipeFormData(formData);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const { data, photo, existingPhotoUrl, galleryPhotos, galleryExisting, stepImages } = parsed;

  // le righe RecipeImage/Step sono full-replace (economiche); solo i FILE non più referenziati
  // da nessuna delle due parti vengono cancellati da disco — un fotogramma reel può comparire
  // sia in galleria che come immagine di uno step, quindi va risolto tutto prima di cancellare
  // qualsiasi cosa, altrimenti si rischia di cancellare un file ancora usato dall'altra parte
  let photoUrl: string | null;
  let newFilenames: string[];
  let stepImageFilenames: (string | null)[];
  let saved: string[];
  try {
    ({ photoUrl, galleryFilenames: newFilenames, stepImageFilenames, saved } = await uploadRecipeImages(
      photo,
      existingPhotoUrl,
      galleryPhotos,
      data.steps,
      stepImages,
    ));
  } catch (err) {
    if (err instanceof UploadError) return Response.json({ error: err.message }, { status: 400 });
    throw err;
  }
  // ponytail: le foto già caricate restano prima delle nuove; un ordine misto va riordinato dopo il salvataggio
  const orderedFilenames = [...galleryExisting, ...newFilenames];

  let recipe;
  try {
    const { hasNutrition, resolvedTagNames } = await resolveRecipeWriteFields(data);

    recipe = await prisma.recipe.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        servingsBase: data.servingsBase,
        prepTimeMinutes: data.prepTimeMinutes,
        cookTimeMinutes: data.cookTimeMinutes,
        sourceUrl: data.sourceUrl,
        videoUrl: data.videoUrl,
        equipment: data.equipment,
        photoUrl,
        ingredients: {
          deleteMany: {},
          create: data.ingredients.map((ing, index) => ({ ...ing, sortOrder: index })),
        },
        steps: {
          deleteMany: {},
          create: data.steps.map((step, index) => ({
            ...step,
            imageFilename: stepImageFilenames[index],
            sortOrder: index,
          })),
        },
        tags: {
          set: [],
          connectOrCreate: resolvedTagNames.map((name) => ({
            where: { name },
            create: { name },
          })),
        },
        images: {
          deleteMany: {},
          create: orderedFilenames.map((filename, index) => ({ filename, sortOrder: index })),
        },
        nutrition: hasNutrition
          ? { upsert: { create: data.nutrition, update: data.nutrition } }
          : existing.nutrition
            ? { delete: true }
            : undefined,
      },
    });
  } catch (err) {
    // DB write failed: the files just written are referenced by nothing, remove them
    await Promise.all(saved.map(deleteUpload));
    throw err;
  }

  // file cancellati solo dopo l'update riuscito: se il DB fallisce, nessun file referenziato sparisce
  const stillReferenced = new Set([photoUrl, ...orderedFilenames, ...stepImageFilenames]);
  await deleteUnreferencedUploads(
    recipeFilenames(existing).filter((f) => !stillReferenced.has(f)),
    id,
  );
  await deleteOrphanTags();

  return Response.json(recipe);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const { record: existing, notFound } = await findOrNotFound(
    () => prisma.recipe.findUnique({ where: { id }, include: { images: true, steps: true } }),
    "Ricetta non trovata",
  );
  if (notFound) return notFound;

  await prisma.recipe.delete({ where: { id } });
  await deleteUnreferencedUploads(recipeFilenames(existing), id);
  await deleteOrphanTags();

  return Response.json({ ok: true });
}
