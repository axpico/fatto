import { prisma } from "@/lib/db";
import type { IngredientMatchRow } from "@/lib/ingredientMatch";

// ponytail: fuzzy/substring matching resta in Postgres (pg_trgm + ILIKE), qui solo raggruppamento/rank
export async function findIngredientMatches(terms: string[]): Promise<IngredientMatchRow[]> {
  const cleaned = terms.map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (cleaned.length === 0) return [];

  return prisma.$queryRaw<IngredientMatchRow[]>`
    SELECT DISTINCT i."recipeId" AS "recipeId", t.term AS term
    FROM unnest(${cleaned}::text[]) AS t(term)
    JOIN "Ingredient" i
      ON i.name ILIKE '%' || t.term || '%'
      OR similarity(i.name, t.term) > 0.3
  `;
}

// ponytail: stesso pattern pg_trgm di findIngredientMatches, ma filtrato su una ricetta
// e proiettato sull'id ingrediente invece che sul recipeId, per i badge "hai in dispensa"
export async function findPantryMatchesForRecipe(
  recipeId: string,
  pantryNames: string[],
): Promise<Set<string>> {
  const cleaned = pantryNames.map((n) => n.trim().toLowerCase()).filter(Boolean);
  if (cleaned.length === 0) return new Set();

  const rows = await prisma.$queryRaw<{ ingredientId: string }[]>`
    SELECT DISTINCT i.id AS "ingredientId"
    FROM unnest(${cleaned}::text[]) AS t(term)
    JOIN "Ingredient" i
      ON i."recipeId" = ${recipeId}
      AND (i.name ILIKE '%' || t.term || '%' OR similarity(i.name, t.term) > 0.3)
  `;

  return new Set(rows.map((r) => r.ingredientId));
}
