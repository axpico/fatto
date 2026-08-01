"use client";

import { inputClasses } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { ReorderableRows } from "@/components/ui/ReorderableRows";
import { CANONICAL_UNITS } from "@/lib/units";
import { useSuggestions } from "@/lib/useSuggestions";

export type IngredientRow = {
  name: string;
  quantity: number | null;
  unit: string | null;
  optional: boolean;
};

export function IngredientRows({
  value,
  onChange,
}: {
  value: IngredientRow[];
  onChange: (rows: IngredientRow[]) => void;
}) {
  const suggestions = useSuggestions<{ name: string }>("/api/ingredients", (r) => r.name);

  return (
    <>
      <ReorderableRows
        items={value}
        onChange={onChange}
        itemLabel="ingrediente"
        addLabel="Aggiungi ingrediente"
        onAdd={() => ({ name: "", quantity: null, unit: null, optional: false })}
        renderFields={(row, _index, update) => (
          <>
            <input
              type="text"
              list="ingredient-suggestions"
              placeholder="Ingrediente"
              aria-label="Nome ingrediente"
              value={row.name}
              onChange={(e) => update({ name: e.target.value })}
              className={`flex-1 ${inputClasses}`}
            />
            <input
              type="number"
              step="any"
              placeholder="Qtà"
              aria-label="Quantità"
              value={row.quantity ?? ""}
              onChange={(e) => update({ quantity: e.target.value ? Number(e.target.value) : null })}
              className={`w-20 ${inputClasses}`}
            />
            <input
              type="text"
              list="unit-suggestions"
              placeholder="Unità"
              aria-label="Unità"
              value={row.unit ?? ""}
              onChange={(e) => update({ unit: e.target.value || null })}
              className={`w-20 ${inputClasses}`}
            />
          </>
        )}
        renderOptional={(row, _index, update) => (
          <Checkbox
            label="Facoltativo"
            checked={row.optional}
            onChange={(e) => update({ optional: e.target.checked })}
          />
        )}
      />
      <datalist id="ingredient-suggestions">
        {suggestions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <datalist id="unit-suggestions">
        {CANONICAL_UNITS.map((unit) => (
          <option key={unit} value={unit} />
        ))}
      </datalist>
    </>
  );
}
