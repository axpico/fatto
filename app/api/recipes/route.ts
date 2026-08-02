import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { UploadError } from "@/lib/uploads";
import { parseRecipeFormData } from "@/lib/parseRecipeFormData";
import { findIngredientMatches } from "@/lib/ingredientSearch";
import { rankRecipesByIngredientMatches } from "@/lib/ingredientMatch";
import { searchRecipesByText } from "@/lib/recipeSearch";
import { uploadRecipeImages, resolveRecipeWriteFields, syncIngredientCatalog } from "@/lib/recipeUpsert";
import type { Prisma } from "@/lib/generated/prisma/client";

const SORTS = ["relevance", "best-match", "recent", "most-cooked", "prep-time"] as const;
type Sort = (typeof SORTS)[number];

export async function GET(request: Request) {
  const { user, unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const tagIds = searchParams.get("tags")?.split(",").filter(Boolean) ?? [];
  const tagMode = searchParams.get("tagMode") === "any" ? "any" : "all";
  const ingredientTerms = searchParams.get("ingredients")?.split(",").filter(Boolean) ?? [];
  const prepMax = numberParam(searchParams, "prepMax");
  const cookMax = numberParam(searchParams, "cookMax");
  const servingsMin = numberParam(searchParams, "servingsMin");
  const ratingMin = numberParam(searchParams, "ratingMin");
  const favoritesOnly = searchParams.get("favorites") === "1";
  const sortParam = searchParams.get("sort");
  const sort: Sort = SORTS.includes(sortParam as Sort) ? (sortParam as Sort) : "recent";

  let ingredientRankByRecipeId: Map<string, number> | null = null;
  if (ingredientTerms.length > 0) {
    const matches = await findIngredientMatches(ingredientTerms);
    const ranked = rankRecipesByIngredientMatches(matches);
    if (ranked.length === 0) return Response.json([]);
    ingredientRankByRecipeId = new Map(ranked.map((r) => [r.recipeId, r.matchCount]));
  }

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
    ...(tagIds.length > 0 && (tagMode === "any"
      ? { tags: { some: { id: { in: tagIds } } } }
      : { AND: tagIds.map((id) => ({ tags: { some: { id } } })) })),
    ...(prepMax != null && { prepTimeMinutes: { lte: prepMax } }),
    ...(cookMax != null && { cookTimeMinutes: { lte: cookMax } }),
    ...(servingsMin != null && { servingsBase: { gte: servingsMin } }),
    ...(favoritesOnly && { favorites: { some: { userId: user.id } } }),
    ...(idConstraints.length > 0 && {
      id: { in: idConstraints.reduce((a, b) => a.filter((id) => b.includes(id))) },
    }),
  };

  const dbOrderBy: Prisma.RecipeOrderByWithRelationInput =
    sort === "most-cooked" ? { cookLogs: { _count: "desc" } } : sort === "prep-time" ? { prepTimeMinutes: "asc" } : { createdAt: "desc" };

  const recipes = await prisma.recipe.findMany({
    where,
    orderBy: dbOrderBy,
    include: { tags: true, _count: { select: { cookLogs: true } }, favorites: { where: { userId: user.id }, select: { id: true } } },
  });

  // relevance/best-match sono calcolati in JS sopra la base order del DB, e ricadono su di
  // essa quando il rank richiesto non è disponibile (es. sort=relevance senza query di testo)
  if (sort === "best-match" && ingredientRankByRecipeId) {
    recipes.sort((a, b) => ingredientRankByRecipeId!.get(b.id)! - ingredientRankByRecipeId!.get(a.id)!);
  } else if (sort === "relevance" && textRankByRecipeId) {
    recipes.sort((a, b) => textRankByRecipeId!.get(b.id)! - textRankByRecipeId!.get(a.id)!);
  }

  return Response.json(recipes.map(({ favorites, ...r }) => ({ ...r, favorite: favorites.length > 0 })));
}

function numberParam(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function POST(request: Request) {
  const { user, unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const formData = await request.formData();
  const parsed = parseRecipeFormData(formData);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const { data, photo, existingPhotoUrl, galleryPhotos, stepImages } = parsed;

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
      createdById: user!.id,
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
        create: galleryFilenames.map((filename, index) => ({ filename, sortOrder: index })),
      },
      ...(hasNutrition && { nutrition: { create: data.nutrition } }),
    },
  });

  await syncIngredientCatalog(data.ingredients);

  return Response.json(recipe, { status: 201 });
}
