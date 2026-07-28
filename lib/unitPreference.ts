"use client";

import { useState } from "react";
import { useLocalStorageSync } from "@/lib/useLocalStorageSync";

export const UNIT_PREF_STORAGE_KEY = "fatto-unit-preference";
export const UNIT_PREF_EVENT = "fatto-unit-preference-change";

export function resolveUnitPreference(stored: string | null): boolean {
  return stored === "metric";
}

export function useGlobalUnitPreference(): [boolean, (metric: boolean) => void] {
  const [metric, set] = useLocalStorageSync(UNIT_PREF_STORAGE_KEY, UNIT_PREF_EVENT, resolveUnitPreference, false);
  return [metric, (next) => set(next ? "metric" : "original")];
}

// ponytail: override locale non persistito, serve solo a "provare" la conversione su una vista
// senza cambiare la preferenza globale salvata in Settings
export function useUnitPreference(): [boolean, () => void] {
  const [global] = useGlobalUnitPreference();
  const [override, setOverride] = useState<boolean | null>(null);
  const useMetric = override ?? global;
  return [useMetric, () => setOverride(!useMetric)];
}
