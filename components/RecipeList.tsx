"use client";

import { LayoutGrid, List as ListIcon } from "lucide-react";
import { RecipeCard, type RecipeCardData } from "@/components/RecipeCard";
import { Reveal } from "@/components/motion/Reveal";
import { useLocalStorageSync } from "@/lib/useLocalStorageSync";

export const VIEW_STORAGE_KEY = "fatto-recipe-view";
export const VIEW_EVENT = "fatto-recipe-view-change";
export type View = "list" | "grid";

export function resolveRecipeView(stored: string | null): View {
  return stored === "grid" ? "grid" : "list";
}

export function RecipeList({ recipes }: { recipes: RecipeCardData[] }) {
  const [view, setView] = useLocalStorageSync(VIEW_STORAGE_KEY, VIEW_EVENT, resolveRecipeView, "list");

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
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              view === value ? "bg-accent text-primary" : "text-muted-foreground hover:bg-surface-secondary"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className={view === "grid" ? "tilt-grid grid grid-cols-2 gap-3 sm:grid-cols-3" : "space-y-3"}>
        {recipes.map((recipe, index) => (
          <Reveal key={recipe.id} delay={Math.min(index, 8) * 40}>
            <RecipeCard recipe={recipe} variant={view} />
          </Reveal>
        ))}
      </div>
    </div>
  );
}
