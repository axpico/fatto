import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { buildRecipeWhere, parseRecipeFilters, rankByIngredients } from "@/lib/recipeSearch";

const REJECT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const { user, unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const { tagIds, tagMode, ingredientTerms, prepMax, cookMax } = parseRecipeFilters(searchParams);

  const ingredientRankByRecipeId = await rankByIngredients(ingredientTerms);
  if (ingredientRankByRecipeId?.size === 0) return Response.json([]);
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
