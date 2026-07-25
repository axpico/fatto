import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { saveUpload, deleteUpload } from "@/lib/uploads";
import { parseRecipeFormData } from "@/lib/parseRecipeFormData";

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
    },
  });

  if (!recipe) return Response.json({ error: "Ricetta non trovata" }, { status: 404 });
  return Response.json(recipe);
}

export async function PATCH(request: Request, { params }: Params) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const existing = await prisma.recipe.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Ricetta non trovata" }, { status: 404 });

  const formData = await request.formData();
  const parsed = parseRecipeFormData(formData);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const { data, photo } = parsed;

  let photoUrl = existing.photoUrl;
  if (photo) {
    await deleteUpload(existing.photoUrl);
    photoUrl = await saveUpload(photo);
  }

  const recipe = await prisma.recipe.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      servingsBase: data.servingsBase,
      prepTimeMinutes: data.prepTimeMinutes,
      cookTimeMinutes: data.cookTimeMinutes,
      sourceUrl: data.sourceUrl,
      photoUrl,
      ingredients: {
        deleteMany: {},
        create: data.ingredients.map((ing, index) => ({ ...ing, sortOrder: index })),
      },
      steps: {
        deleteMany: {},
        create: data.steps.map((step, index) => ({ ...step, sortOrder: index })),
      },
      tags: {
        set: [],
        connectOrCreate: data.tags.map((name) => ({
          where: { name: name.toLowerCase() },
          create: { name: name.toLowerCase() },
        })),
      },
    },
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
