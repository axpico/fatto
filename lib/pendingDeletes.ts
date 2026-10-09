"use client";

import { useSyncExternalStore } from "react";

// Recipes deleted but still inside their undo window: lists hide them right away even though the
// server still has them (the DELETE is deferred, see DeleteRecipeButton).
let hidden: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();

function setHidden(next: ReadonlySet<string>) {
  hidden = next;
  listeners.forEach((l) => l());
}

export function hideRecipe(id: string) {
  setHidden(new Set([...hidden, id]));
}

export function unhideRecipe(id: string) {
  setHidden(new Set([...hidden].filter((h) => h !== id)));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY: ReadonlySet<string> = new Set();

export function useHiddenRecipes(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, () => hidden, () => EMPTY);
}
