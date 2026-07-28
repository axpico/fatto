import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { saveUpload, deleteUpload } from "@/lib/uploads";
import { parseRecipeFormData } from "@/lib/parseRecipeFormData";
import { resolveTagNames } from "@/lib/tagDedupe";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: { orderBy: { sortOrder: "asc" } },
      steps: { orderBy: { sortOrder: "asc" } },
      tags: true,
      cookLogs: { orderBy: { cookedAt: "desc" }, include: { user: true } },
      images: { orderBy: { sortOrder: "asc" } },
      nutrition: true,
    },
  });

  if (!recipe) return Response.json({ error: "Ricetta non trovata" }, { status: 404 });
  return Response.json(recipe);
}

export async function PATCH(request: Request, { params }: Params) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const existing = await prisma.recipe.findUnique({
    where: { id },
    include: { images: true, nutrition: true, steps: true },
  });
  if (!existing) return Response.json({ error: "Ricetta non trovata" }, { status: 404 });

  const formData = await request.formData();
  const parsed = parseRecipeFormData(formData);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const { data, photo, galleryPhotos, galleryExisting, stepImages } = parsed;

  let photoUrl = existing.photoUrl;
  if (photo) {
    await deleteUpload(existing.photoUrl);
    photoUrl = await saveUpload(photo);
  }

  // le righe RecipeImage/Step sono full-replace (economiche); solo i FILE non più referenziati
  // da nessuna delle due parti vengono cancellati da disco — un fotogramma reel può comparire
  // sia in galleria che come immagine di uno step, quindi va risolto tutto prima di cancellare
  // qualsiasi cosa, altrimenti si rischia di cancellare un file ancora usato dall'altra parte
  const newFilenames = await Promise.all(galleryPhotos.map((f) => saveUpload(f)));
  const orderedFilenames = [...galleryExisting, ...newFilenames];

  const stepImageFilenames = await Promise.all(
    data.steps.map((step, i) => (stepImages[i] ? saveUpload(stepImages[i]!) : Promise.resolve(step.imageFilename))),
  );

  const stillReferenced = new Set([
    ...orderedFilenames,
    ...stepImageFilenames.filter((f): f is string => f != null),
  ]);
  const oldStepImages = existing.steps.map((s) => s.imageFilename).filter((f): f is string => f != null);
  const oldFilenames = new Set([...existing.images.map((img) => img.filename), ...oldStepImages]);
  await Promise.all([...oldFilenames].filter((f) => !stillReferenced.has(f)).map(deleteUpload));

  const hasNutrition = Object.values(data.nutrition).some((v) => v !== null);
  const resolvedTagNames = await resolveTagNames(data.tags);

  const recipe = await prisma.recipe.update({
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

  await prisma.ingredientCatalog.createMany({
    data: data.ingredients.map((i) => ({ name: i.name.trim().toLowerCase() })),
    skipDuplicates: true,
  });

  return Response.json(recipe);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const existing = await prisma.recipe.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Ricetta non trovata" }, { status: 404 });

  await deleteUpload(existing.photoUrl);
  await prisma.recipe.delete({ where: { id } });

  return Response.json({ ok: true });
}
