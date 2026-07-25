export type IngredientMatchRow = { recipeId: string; term: string };

export function rankRecipesByIngredientMatches(
  rows: IngredientMatchRow[],
): { recipeId: string; matchCount: number }[] {
  const termsByRecipe = new Map<string, Set<string>>();

  for (const { recipeId, term } of rows) {
    if (!termsByRecipe.has(recipeId)) termsByRecipe.set(recipeId, new Set());
    termsByRecipe.get(recipeId)!.add(term);
  }

  return [...termsByRecipe.entries()]
    .map(([recipeId, terms]) => ({ recipeId, matchCount: terms.size }))
    .sort((a, b) => b.matchCount - a.matchCount);
}
