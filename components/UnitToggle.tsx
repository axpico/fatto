"use client";

import { Button } from "@/components/ui/Button";

export function UnitToggle({ useMetric, onToggle }: { useMetric: boolean; onToggle: () => void }) {
  return (
    <Button type="button" variant="secondary" size="sm" onClick={onToggle}>
      {useMetric ? "Unità originali" : "In g/ml"}
    </Button>
  );
}
