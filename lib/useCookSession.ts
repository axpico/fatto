"use client";

import { useState } from "react";

function storageKey(recipeId: string) {
  return `fatto-cook-session-${recipeId}`;
}

function readSession<T>(recipeId: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(recipeId));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

// Sessione di cottura (passaggio corrente + timer) salvata per ricetta, per sopravvivere a
// ricarica/passaggio in background. Nessuna sync multi-tab: a differenza di useLocalStorageSync
// (pensato per preferenze condivise), qui non serve per un caso d'uso personale.
export function useCookSession<T>(recipeId: string) {
  const [restored] = useState(() => readSession<T>(recipeId));

  function save(state: T) {
    try {
      localStorage.setItem(storageKey(recipeId), JSON.stringify(state));
    } catch {
      // ponytail: storage pieno/non disponibile, la cottura funziona comunque senza persistenza
    }
  }

  function clear() {
    try {
      localStorage.removeItem(storageKey(recipeId));
    } catch {
      // vedi sopra
    }
  }

  return { restored, save, clear };
}
