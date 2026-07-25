"use client";

import { X, Plus } from "lucide-react";
import { inputClasses } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export type IngredientRow = { name: string; quantity: number | null; unit: string | null };

export function IngredientRows({
  value,
  onChange,
}: {
  value: IngredientRow[];
  onChange: (rows: IngredientRow[]) => void;
}) {
  function update(index: number, patch: Partial<IngredientRow>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...value, { name: "", quantity: null, unit: null }]);
  }

  return (
    <div className="space-y-2">
      {value.map((row, index) => (
        <div key={index} className="flex gap-2">
          <input
            type="text"
            placeholder="Ingrediente"
            value={row.name}
            onChange={(e) => update(index, { name: e.target.value })}
            className={`flex-1 ${inputClasses}`}
          />
          <input
            type="number"
            step="any"
            placeholder="Qtà"
            value={row.quantity ?? ""}
            onChange={(e) => update(index, { quantity: e.target.value ? Number(e.target.value) : null })}
            className={`w-20 ${inputClasses}`}
          />
          <input
            type="text"
            placeholder="Unità"
            value={row.unit ?? ""}
            onChange={(e) => update(index, { unit: e.target.value || null })}
            className={`w-20 ${inputClasses}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => remove(index)}
            aria-label="Rimuovi ingrediente"
            className="px-2 hover:text-destructive"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={add} className="border-dashed">
        <Plus className="h-4 w-4" aria-hidden="true" /> Aggiungi ingrediente
      </Button>
    </div>
  );
}
