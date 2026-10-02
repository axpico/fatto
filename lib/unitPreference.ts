"use client";

import { useLocalStorageSync } from "@/lib/useLocalStorageSync";

const UNIT_PREF_STORAGE_KEY = "fatto-unit-preference";
const UNIT_PREF_EVENT = "fatto-unit-preference-change";

export function resolveUnitPreference(stored: string | null): boolean {
  return stored === "metric";
}

/** Preferenza unità salvata (g/ml o originali), condivisa tra Impostazioni, ricetta e stampa. */
export function useUnitPreference(): [boolean, (metric: boolean) => void] {
  const [metric, set] = useLocalStorageSync(UNIT_PREF_STORAGE_KEY, UNIT_PREF_EVENT, resolveUnitPreference, false);
  return [metric, (next) => set(next ? "metric" : "original")];
}
