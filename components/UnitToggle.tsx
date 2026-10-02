"use client";

import { Button } from "@/components/ui/Button";
import { useUnitPreference } from "@/lib/unitPreference";

export function UnitToggle({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const [useMetric, setUseMetric] = useUnitPreference();
  return (
    <Button type="button" variant="secondary" size={size} onClick={() => setUseMetric(!useMetric)}>
      {useMetric ? "Unità originali" : "Converti in g/ml"}
    </Button>
  );
}
