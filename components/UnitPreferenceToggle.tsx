"use client";

import { useGlobalUnitPreference } from "@/lib/unitPreference";
import { UnitToggle } from "@/components/UnitToggle";

export function UnitPreferenceToggle() {
  const [metric, setMetric] = useGlobalUnitPreference();
  return <UnitToggle useMetric={metric} onToggle={() => setMetric(!metric)} size="md" offLabel="Converti in g/ml" />;
}
