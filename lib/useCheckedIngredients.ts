"use client";

import { useMemo } from "react";
import { useLocalStorageSync } from "@/lib/useLocalStorageSync";

const CHECKED_EVENT = "fatto-checked-change";

function storageKey(recipeId: string) {
  return `fatto-checked-${recipeId}`;
}

// Ingredienti spuntati per ricetta, condivisi tra pagina ricetta e modalità cottura e persistenti
// a una ricarica; azzerati a fine cottura (clearCheckedIngredients).
export function useCheckedIngredients(recipeId: string): [ReadonlySet<string>, (id: string) => void] {
  // the raw string is the snapshot (stable across reads); parsing happens in useMemo
  const [raw, set] = useLocalStorageSync(storageKey(recipeId), CHECKED_EVENT, (s) => s ?? "", "");
  const checked = useMemo<ReadonlySet<string>>(() => {
    try {
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  }, [raw]);

  function toggle(id: string) {
    const next = checked.has(id) ? [...checked].filter((c) => c !== id) : [...checked, id];
    set(JSON.stringify(next));
  }

  return [checked, toggle];
}

export function clearCheckedIngredients(recipeId: string) {
  try {
    localStorage.removeItem(storageKey(recipeId));
    window.dispatchEvent(new Event(CHECKED_EVENT));
  } catch {
    // storage unavailable: nothing persisted to clear
  }
}
