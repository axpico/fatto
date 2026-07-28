"use client";

import { useGlobalUnitPreference } from "@/lib/unitPreference";
import { Button } from "@/components/ui/Button";

export function UnitPreferenceToggle() {
  const [metric, setMetric] = useGlobalUnitPreference();

  function toggle() {
    setMetric(!metric);
  }

  return (
    <Button type="button" variant="secondary" onClick={toggle}>
      {metric ? "Unità originali" : "Converti in g/ml"}
    </Button>
  );
}
