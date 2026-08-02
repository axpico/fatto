"use client";

import { Button } from "@/components/ui/Button";

export function UnitToggle({
  useMetric,
  onToggle,
  size = "sm",
  offLabel = "In g/ml",
}: {
  useMetric: boolean;
  onToggle: () => void;
  size?: "sm" | "md" | "lg";
  offLabel?: string;
}) {
  return (
    <Button type="button" variant="secondary" size={size} onClick={onToggle}>
      {useMetric ? "Unità originali" : offLabel}
    </Button>
  );
}
