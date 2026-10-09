"use client";

import { useState } from "react";
import { inputClasses } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { ReorderableRows } from "@/components/ui/ReorderableRows";
import { SuggestionDatalist } from "@/components/ui/SuggestionDatalist";
import { CANONICAL_UNITS } from "@/lib/units";
import { useSuggestions } from "@/lib/useSuggestions";
import { parseDecimal } from "@/lib/parseDecimal";

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
        renderFields={(row, index, update) => (
          <>
            <input
              id={`ingredient-name-${index}`}
              type="text"
              list="ingredient-suggestions"
              placeholder="Ingrediente"
              aria-label="Nome ingrediente"
              value={row.name}
              onChange={(e) => update({ name: e.target.value })}
              className={`w-full sm:w-auto sm:flex-1 ${inputClasses}`}
            />
            <QuantityInput value={row.quantity} onChange={(quantity) => update({ quantity })} />
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
      <SuggestionDatalist id="ingredient-suggestions" options={suggestions} />
      <SuggestionDatalist id="unit-suggestions" options={CANONICAL_UNITS} />
    </>
  );
}

// text + inputMode="decimal" instead of type="number": accepts the Italian comma ("0,5"), and
// keeps the raw text while typing so "1," isn't snapped back to "1" mid-edit
function QuantityInput({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  const [text, setText] = useState(() => (value == null ? "" : String(value).replace(".", ",")));
  const invalid = text.trim() !== "" && parseDecimal(text) === null;
  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder="Qtà"
      aria-label="Quantità"
      aria-invalid={invalid}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseDecimal(e.target.value));
      }}
      className={`w-20 ${inputClasses} ${invalid ? "border-destructive" : ""}`}
    />
  );
}
