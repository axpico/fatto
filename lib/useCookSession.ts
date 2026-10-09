"use client";

import { useState } from "react";
import { useLocalStorageSync } from "@/lib/useLocalStorageSync";

const SESSION_EVENT = "fatto-cook-session-change";

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
      window.dispatchEvent(new Event(SESSION_EVENT));
    } catch {
      // vedi sopra
    }
  }

  return { restored, save, clear };
}

/** Passaggio (0-based) di una cottura salvata e non conclusa per questa ricetta, o null. */
export function useSavedCookStep(recipeId: string): number | null {
  const [index] = useLocalStorageSync<number | null>(
    storageKey(recipeId),
    SESSION_EVENT,
    (raw) => {
      try {
        const parsed = raw ? (JSON.parse(raw) as { index?: unknown }) : null;
        return typeof parsed?.index === "number" ? parsed.index : null;
      } catch {
        return null;
      }
    },
    null,
  );
  return index;
}
