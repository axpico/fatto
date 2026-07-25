import { describe, it, expect } from "vitest";
import { rankRecipesByIngredientMatches } from "./ingredientMatch";

describe("rankRecipesByIngredientMatches", () => {
  it("counts distinct matched terms per recipe and sorts descending", () => {
    const result = rankRecipesByIngredientMatches([
      { recipeId: "a", term: "pasta" },
      { recipeId: "a", term: "pomodoro" },
      { recipeId: "b", term: "pasta" },
      { recipeId: "c", term: "pasta" },
      { recipeId: "c", term: "pomodoro" },
      { recipeId: "c", term: "basilico" },
    ]);

    expect(result).toEqual([
      { recipeId: "c", matchCount: 3 },
      { recipeId: "a", matchCount: 2 },
      { recipeId: "b", matchCount: 1 },
    ]);
  });

  it("does not double-count duplicate rows for the same recipe/term", () => {
    const result = rankRecipesByIngredientMatches([
      { recipeId: "a", term: "pasta" },
      { recipeId: "a", term: "pasta" },
    ]);
    expect(result).toEqual([{ recipeId: "a", matchCount: 1 }]);
  });

  it("returns an empty array for no matches", () => {
    expect(rankRecipesByIngredientMatches([])).toEqual([]);
  });
});
