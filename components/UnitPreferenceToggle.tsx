"use client";

import { useGlobalUnitPreference, UNIT_PREF_STORAGE_KEY, UNIT_PREF_EVENT } from "@/lib/unitPreference";
import { Button } from "@/components/ui/Button";

export function UnitPreferenceToggle() {
  const metric = useGlobalUnitPreference();

  function toggle() {
    localStorage.setItem(UNIT_PREF_STORAGE_KEY, metric ? "original" : "metric");
    window.dispatchEvent(new Event(UNIT_PREF_EVENT));
  }

  return (
    <Button type="button" variant="secondary" onClick={toggle}>
      {metric ? "Unità originali" : "Converti in g/ml"}
    </Button>
  );
}
