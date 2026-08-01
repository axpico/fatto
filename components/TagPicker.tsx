"use client";

import { ChipInput } from "@/components/ui/ChipInput";
import { useSuggestions } from "@/lib/useSuggestions";

export function TagPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const existingTags = useSuggestions<{ name: string }>("/api/tags", (t) => t.name);

  return (
    <ChipInput
      value={value}
      onChange={onChange}
      placeholder="Aggiungi un tag e premi invio"
      removeLabel={(item) => `Rimuovi tag ${item}`}
      normalize={(raw) => raw.trim().toLowerCase()}
      suggestions={existingTags}
    />
  );
}
