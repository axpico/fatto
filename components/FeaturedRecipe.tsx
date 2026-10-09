"use client";

import { RecipeCard, type RecipeCardData } from "@/components/RecipeCard";
import { useHiddenRecipes } from "@/lib/pendingDeletes";

// client wrapper so a recipe deleted moments ago (still in its undo window, so still on the
// server) doesn't show up as today's highlight
export function FeaturedRecipe({ recipe }: { recipe: RecipeCardData }) {
  const hidden = useHiddenRecipes();
  if (hidden.has(recipe.id)) return null;
  return (
    <section className="space-y-3">
      <h2 className="section-title">Sorpresa del giorno</h2>
      <RecipeCard recipe={recipe} variant="featured" />
    </section>
  );
}
