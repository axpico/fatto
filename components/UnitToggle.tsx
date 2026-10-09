"use client";

import { useUnitPreference } from "@/lib/unitPreference";

const SIZE_CLASSES = { sm: "min-h-9 px-3 text-sm", md: "min-h-10 px-4 text-sm", lg: "min-h-11 px-5 text-base" };

// segmented control: shows which units are active, not just what tapping would switch to
export function UnitToggle({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const [useMetric, setUseMetric] = useUnitPreference();
  return (
    <div role="group" aria-label="Unità di misura" className="inline-flex rounded-lg border border-border bg-surface p-0.5">
      {([
        [false, "Originali"],
        [true, "g/ml"],
      ] as const).map(([metric, label]) => (
        <button
          key={label}
          type="button"
          aria-pressed={useMetric === metric}
          onClick={() => setUseMetric(metric)}
          className={`rounded-md font-medium transition-colors ${SIZE_CLASSES[size]} ${
            useMetric === metric ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
