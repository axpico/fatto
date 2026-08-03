import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { findIngredientMatches } from "@/lib/ingredientSearch";
import { rankRecipesByIngredientMatches } from "@/lib/ingredientMatch";
import { buildRecipeWhere } from "@/lib/recipeSearch";

const REJECT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const { user, unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const tagIds = searchParams.get("tags")?.split(",").filter(Boolean) ?? [];
  const tagMode = searchParams.get("tagMode") === "any" ? "any" : "all";
  const ingredientTerms = searchParams.get("ingredients")?.split(",").filter(Boolean) ?? [];
  const prepMax = numberParam(searchParams, "prepMax");
  const cookMax = numberParam(searchParams, "cookMax");

  let ingredientRankByRecipeId: Map<string, number> | null = null;
  if (ingredientTerms.length > 0) {
    const matches = await findIngredientMatches(ingredientTerms);
    const ranked = rankRecipesByIngredientMatches(matches);
    if (ranked.length === 0) return Response.json([]);
    ingredientRankByRecipeId = new Map(ranked.map((r) => [r.recipeId, r.matchCount]));
  }

  const idConstraints = ingredientRankByRecipeId ? [[...ingredientRankByRecipeId.keys()]] : [];

  const where = {
    ...buildRecipeWhere({ tagIds, tagMode, prepMax, cookMax, idConstraints }),
    swipeRejects: {
      none: { userId: user.id, rejectedAt: { gt: new Date(Date.now() - REJECT_COOLDOWN_MS) } },
    },
  };

  const recipes = await prisma.recipe.findMany({
    where,
    include: { tags: true, favorites: { where: { userId: user.id }, select: { id: true } } },
  });

  return Response.json(recipes.map(({ favorites, ...r }) => ({ ...r, favorite: favorites.length > 0 })));
}

function numberParam(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
