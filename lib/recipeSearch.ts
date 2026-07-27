import { prisma } from "@/lib/db";

export type RecipeSearchRow = { recipeId: string; rank: number };

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
