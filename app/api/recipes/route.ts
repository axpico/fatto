import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { saveUpload } from "@/lib/uploads";
import { parseRecipeFormData } from "@/lib/parseRecipeFormData";
import { findIngredientMatches } from "@/lib/ingredientSearch";
import { rankRecipesByIngredientMatches } from "@/lib/ingredientMatch";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function GET(request: Request) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const tagIds = searchParams.get("tags")?.split(",").filter(Boolean) ?? [];
  const ingredientTerms = searchParams.get("ingredients")?.split(",").filter(Boolean) ?? [];

  let rankByRecipeId: Map<string, number> | null = null;
  if (ingredientTerms.length > 0) {
    const matches = await findIngredientMatches(ingredientTerms);
    const ranked = rankRecipesByIngredientMatches(matches);
    if (ranked.length === 0) return Response.json([]);
    rankByRecipeId = new Map(ranked.map((r) => [r.recipeId, r.matchCount]));
  }

  const where: Prisma.RecipeWhereInput = {
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    }),
    ...(tagIds.length > 0 && {
      AND: tagIds.map((id) => ({ tags: { some: { id } } })),
    }),
    ...(rankByRecipeId && { id: { in: [...rankByRecipeId.keys()] } }),
  };

  const recipes = await prisma.recipe.findMany({
    where,
    orderBy: rankByRecipeId ? undefined : { createdAt: "desc" },
    include: { tags: true, _count: { select: { cookLogs: true } } },
  });

  if (rankByRecipeId) {
    recipes.sort((a, b) => rankByRecipeId!.get(b.id)! - rankByRecipeId!.get(a.id)!);
  }

  return Response.json(recipes);
}

export async function POST(request: Request) {
  const { user, unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const formData = await request.formData();
  const parsed = parseRecipeFormData(formData);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const { data, photo, existingPhotoUrl, galleryPhotos } = parsed;

  const photoUrl = photo ? await saveUpload(photo) : existingPhotoUrl;
  const galleryFilenames = await Promise.all(galleryPhotos.map((f) => saveUpload(f)));
  const hasNutrition = Object.values(data.nutrition).some((v) => v !== null);

  const recipe = await prisma.recipe.create({
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
      createdById: user!.id,
      ingredients: {
        create: data.ingredients.map((ing, index) => ({ ...ing, sortOrder: index })),
      },
      steps: {
        create: data.steps.map((step, index) => ({ ...step, sortOrder: index })),
      },
      tags: {
        connectOrCreate: data.tags.map((name) => ({
          where: { name: name.toLowerCase() },
          create: { name: name.toLowerCase() },
        })),
      },
      images: {
        create: galleryFilenames.map((filename, index) => ({ filename, sortOrder: index })),
      },
      ...(hasNutrition && { nutrition: { create: data.nutrition } }),
    },
  });

  await prisma.ingredientCatalog.createMany({
    data: data.ingredients.map((i) => ({ name: i.name.trim().toLowerCase() })),
    skipDuplicates: true,
  });

  return Response.json(recipe, { status: 201 });
}
