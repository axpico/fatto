"use client";

import { useSyncExternalStore } from "react";
import { LayoutGrid, List as ListIcon } from "lucide-react";
import { RecipeCard, type RecipeCardData } from "@/components/RecipeCard";

const VIEW_STORAGE_KEY = "fatto-recipe-view";
const VIEW_EVENT = "fatto-recipe-view-change";
type View = "list" | "grid";

function subscribe(callback: () => void) {
  window.addEventListener(VIEW_EVENT, callback);
  return () => window.removeEventListener(VIEW_EVENT, callback);
}

function getSnapshot(): View {
  return localStorage.getItem(VIEW_STORAGE_KEY) === "grid" ? "grid" : "list";
}

function getServerSnapshot(): View {
  return "list";
}

export function RecipeList({ recipes }: { recipes: RecipeCardData[] }) {
  const view = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function select(next: View) {
    localStorage.setItem(VIEW_STORAGE_KEY, next);
    window.dispatchEvent(new Event(VIEW_EVENT));
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
      <div className={view === "grid" ? "grid grid-cols-2 gap-3 sm:grid-cols-3" : "space-y-3"}>
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} variant={view} />
        ))}
      </div>
    </div>
  );
}
