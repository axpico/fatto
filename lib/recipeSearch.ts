import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

export type RecipeSearchRow = { recipeId: string; rank: number };

export function buildRecipeWhere(opts: {
  tagIds: string[];
  tagMode: "all" | "any";
  prepMax: number | null;
  cookMax: number | null;
  idConstraints: string[][];
}): Prisma.RecipeWhereInput {
  const { tagIds, tagMode, prepMax, cookMax, idConstraints } = opts;
  return {
    ...(tagIds.length > 0 && (tagMode === "any"
      ? { tags: { some: { id: { in: tagIds } } } }
      : { AND: tagIds.map((id) => ({ tags: { some: { id } } })) })),
    ...(prepMax != null && { prepTimeMinutes: { lte: prepMax } }),
    ...(cookMax != null && { cookTimeMinutes: { lte: cookMax } }),
    ...(idConstraints.length > 0 && {
      id: { in: idConstraints.reduce((a, b) => a.filter((id) => b.includes(id))) },
    }),
  };
}

// ponytail: fallback ILIKE tiene vivo il match parziale/con refusi; ts_rank vale 0 sulle righe
// prese solo da ILIKE quindi i veri hit full-text restano comunque in cima all'ORDER BY
export async function searchRecipesByText(q: string): Promise<RecipeSearchRow[]> {
  const term = q.trim();
  if (!term) return [];

  return prisma.$queryRaw<RecipeSearchRow[]>`
    SELECT id AS "recipeId",
           ts_rank(search_vector, websearch_to_tsquery('italian', ${term})) AS rank
    FROM "Recipe"
    WHERE search_vector @@ websearch_to_tsquery('italian', ${term})
       OR title ILIKE '%' || ${term} || '%'
       OR description ILIKE '%' || ${term} || '%'
    ORDER BY rank DESC
  `;
}
