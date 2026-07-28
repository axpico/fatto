"use client";

import { useState, useSyncExternalStore } from "react";

export const UNIT_PREF_STORAGE_KEY = "fatto-unit-preference";
export const UNIT_PREF_EVENT = "fatto-unit-preference-change";

export function resolveUnitPreference(stored: string | null): boolean {
  return stored === "metric";
}

function subscribe(callback: () => void) {
  window.addEventListener(UNIT_PREF_EVENT, callback);
  return () => window.removeEventListener(UNIT_PREF_EVENT, callback);
}

function getSnapshot(): boolean {
  return resolveUnitPreference(localStorage.getItem(UNIT_PREF_STORAGE_KEY));
}

function getServerSnapshot(): boolean {
  return false;
}

export function useGlobalUnitPreference(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ponytail: override locale non persistito, serve solo a "provare" la conversione su una vista
// senza cambiare la preferenza globale salvata in Settings
export function useUnitPreference(): [boolean, () => void] {
  const global = useGlobalUnitPreference();
  const [override, setOverride] = useState<boolean | null>(null);
  const useMetric = override ?? global;
  return [useMetric, () => setOverride(!useMetric)];
}
