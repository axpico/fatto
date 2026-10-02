import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { UploadError } from "@/lib/uploads";
import { parseRecipeFormData } from "@/lib/parseRecipeFormData";
import { buildRecipeWhere, parseRecipeFilters, rankByIngredients, searchRecipesByText } from "@/lib/recipeSearch";
import { compareBySort, computeCookStats, parseRecipeSort, type RecipeSort } from "@/lib/recipeStats";
import { uploadRecipeImages, resolveRecipeWriteFields } from "@/lib/recipeUpsert";
import type { Prisma } from "@/lib/generated/prisma/client";

// relevance/best-match dipendono dalla query di Cerca; gli altri sono condivisi con la Home
type Sort = "relevance" | "best-match" | RecipeSort;

export async function GET(request: Request) {
  const { user, unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const { tagIds, tagMode, ingredientTerms, prepMax, cookMax, servingsMin, ratingMin, favoritesOnly } =
    parseRecipeFilters(searchParams);
  const sortParam = searchParams.get("sort");
  const sort: Sort = sortParam === "relevance" || sortParam === "best-match" ? sortParam : parseRecipeSort(sortParam);

  const ingredientRankByRecipeId = await rankByIngredients(ingredientTerms);
  if (ingredientRankByRecipeId?.size === 0) return Response.json([]);

  let textRankByRecipeId: Map<string, number> | null = null;
  if (q) {
    const ranked = await searchRecipesByText(q);
    if (ranked.length === 0) return Response.json([]);
    textRankByRecipeId = new Map(ranked.map((r) => [r.recipeId, r.rank]));
  }

  let ratingRecipeIds: string[] | null = null;
  if (ratingMin != null) {
    const ratingRows = await prisma.cookLog.groupBy({
      by: ["recipeId"],
      _avg: { rating: true },
      having: { rating: { _avg: { gte: ratingMin } } },
    });
    if (ratingRows.length === 0) return Response.json([]);
    ratingRecipeIds = ratingRows.map((r) => r.recipeId);
  }

  const idConstraints = [textRankByRecipeId && [...textRankByRecipeId.keys()], ingredientRankByRecipeId && [...ingredientRankByRecipeId.keys()], ratingRecipeIds].filter(
    (c): c is string[] => c != null,
  );

  const where: Prisma.RecipeWhereInput = {
    ...buildRecipeWhere({ tagIds, tagMode, prepMax, cookMax, idConstraints }),
    ...(servingsMin != null && { servingsBase: { gte: servingsMin } }),
    ...(favoritesOnly && { favorites: { some: { userId: user.id } } }),
  };

  const rows = await prisma.recipe.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      tags: true,
      cookLogs: { select: { rating: true, cookedAt: true } },
      favorites: { where: { userId: user.id }, select: { id: true } },
    },
  });
  const recipes = rows.map(({ favorites, cookLogs, ...r }) => ({
    ...r,
    favorite: favorites.length > 0,
    ...computeCookStats(cookLogs),
  }));

  // relevance/best-match ricadono su "recent" quando il rank richiesto non c'è (es. relevance senza testo)
  if (sort === "best-match") {
    if (ingredientRankByRecipeId) recipes.sort((a, b) => ingredientRankByRecipeId.get(b.id)! - ingredientRankByRecipeId.get(a.id)!);
  } else if (sort === "relevance") {
    if (textRankByRecipeId) recipes.sort((a, b) => textRankByRecipeId.get(b.id)! - textRankByRecipeId.get(a.id)!);
  } else if (sort !== "recent") {
    recipes.sort((a, b) => compareBySort(sort, a, b));
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
  const { data, photo, existingPhotoUrl, galleryPhotos, galleryExisting, stepImages } = parsed;

  let photoUrl: string | null;
  let galleryFilenames: string[];
  let stepImageFilenames: (string | null)[];
  try {
    ({ photoUrl, galleryFilenames, stepImageFilenames } = await uploadRecipeImages(
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
  const { hasNutrition, resolvedTagNames } = await resolveRecipeWriteFields(data);

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
      createdById: user.id,
      ingredients: {
        create: data.ingredients.map((ing, index) => ({ ...ing, sortOrder: index })),
      },
      steps: {
        create: data.steps.map((step, index) => ({
          ...step,
          imageFilename: stepImageFilenames[index],
          sortOrder: index,
        })),
      },
      tags: {
        connectOrCreate: resolvedTagNames.map((name) => ({
          where: { name },
          create: { name },
        })),
      },
      images: {
        create: [...galleryExisting, ...galleryFilenames].map((filename, index) => ({ filename, sortOrder: index })),
      },
      ...(hasNutrition && { nutrition: { create: data.nutrition } }),
    },
  });


  return Response.json(recipe, { status: 201 });
}
