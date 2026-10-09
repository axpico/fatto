"use client";

import { LayoutGrid, List as ListIcon } from "lucide-react";
import { RecipeCard, type RecipeCardData } from "@/components/RecipeCard";
import { Reveal } from "@/components/motion/Reveal";
import { useLocalStorageSync } from "@/lib/useLocalStorageSync";
import { useHiddenRecipes } from "@/lib/pendingDeletes";

export const VIEW_STORAGE_KEY = "fatto-recipe-view";
export const VIEW_EVENT = "fatto-recipe-view-change";
type View = "list" | "grid";

export function resolveRecipeView(stored: string | null): View {
  return stored === "grid" ? "grid" : "list";
}

export function RecipeList({ recipes }: { recipes: RecipeCardData[] }) {
  const [view, setView] = useLocalStorageSync(VIEW_STORAGE_KEY, VIEW_EVENT, resolveRecipeView, "list");
  const hidden = useHiddenRecipes();
  const visible = hidden.size ? recipes.filter((r) => !hidden.has(r.id)) : recipes;

  function select(next: View) {
    setView(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-1" role="group" aria-label="Tipo di vista">
        {([
          ["list", ListIcon, "Vista elenco"],
          ["grid", LayoutGrid, "Vista griglia"],
        ] as const).map(([value, Icon, label]) => (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={view === value}
            onClick={() => select(value)}
            className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
              view === value ? "bg-accent text-primary" : "text-muted-foreground hover:bg-surface-secondary"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className={view === "grid" ? "tilt-grid grid grid-cols-2 gap-3 sm:grid-cols-3" : "space-y-3"}>
        {visible.map((recipe, index) => (
          <Reveal key={recipe.id} delay={Math.min(index, 8) * 40}>
            <RecipeCard recipe={recipe} variant={view} />
          </Reveal>
        ))}
      </div>
    </div>
  );
}
