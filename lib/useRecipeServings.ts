"use client";

import { useLocalStorageSync } from "@/lib/useLocalStorageSync";

const SERVINGS_EVENT = "fatto-servings-change";

// Porzioni scelte per una ricetta, condivise tra Dettaglio e Stampa (stesso browser, stessa ricetta) —
// evita che aprire "Stampa" dopo aver regolato le porzioni sul Dettaglio riparta da zero.
export function useRecipeServings(recipeId: string, baseServings: number): [number, (servings: number) => void] {
  const [servings, set] = useLocalStorageSync(
    `fatto-servings-${recipeId}`,
    SERVINGS_EVENT,
    (stored) => {
      const n = stored ? Number(stored) : NaN;
      return Number.isFinite(n) && n > 0 ? n : baseServings;
    },
    baseServings,
  );
  return [servings, (next) => set(String(Math.max(1, next)))];
}
