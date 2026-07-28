"use client";

import { useEffect, useState } from "react";
import { ChipInput } from "@/components/ui/ChipInput";

export function TagPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [existingTags, setExistingTags] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/tags")
      .then((res) => res.json())
      .then((tags: { name: string }[]) => setExistingTags(tags.map((t) => t.name)));
  }, []);

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
