"use client";

import { ChipInput } from "@/components/ui/ChipInput";

export function EquipmentPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (equipment: string[]) => void;
}) {
  return (
    <ChipInput
      value={value}
      onChange={onChange}
      placeholder="Aggiungi un utensile e premi invio"
      removeLabel={(item) => `Rimuovi ${item}`}
    />
  );
}
