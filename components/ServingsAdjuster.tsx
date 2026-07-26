"use client";

import { useState } from "react";
import { Minus, Plus, Check } from "lucide-react";
import { scaleQuantity } from "@/lib/scaling";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Checkbox";

type Ingredient = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  optional: boolean;
};

export function formatQuantity(n: number) {
  return Number(n.toFixed(2)).toString().replace(".", ",");
}

export function ServingsAdjuster({
  baseServings,
  ingredients,
  inPantry = [],
}: {
  baseServings: number;
  ingredients: Ingredient[];
  inPantry?: string[];
}) {
  const [servings, setServings] = useState(baseServings);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  function toggleChecked(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <label className="text-sm font-medium text-foreground">Porzioni</label>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setServings((s) => Math.max(1, s - 1))}
          className="h-9 w-9 px-0"
          aria-label="Diminuisci porzioni"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </Button>
        <input
          type="number"
          min={1}
          value={servings}
          onChange={(e) => setServings(Math.max(1, Number(e.target.value) || 1))}
          className={`w-16 py-1.5 text-center ${inputClasses}`}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setServings((s) => s + 1)}
          className="h-9 w-9 px-0"
          aria-label="Aumenta porzioni"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <ul>
        {ingredients.map((ing) => {
          const scaled = scaleQuantity(ing.quantity, baseServings, servings);
          const checked = checkedIds.has(ing.id);
          return (
            <li key={ing.id} className="border-b border-border py-2 last:border-0">
              <label className="flex cursor-pointer items-start gap-2">
                <Checkbox checked={checked} onChange={() => toggleChecked(ing.id)} className="mt-1" />
                <span
                  className={`w-16 shrink-0 text-right font-medium tabular-nums ${
                    checked ? "text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {scaled !== null ? `${formatQuantity(scaled)} ${ing.unit ?? ""}` : ""}
                </span>
                <span
                  className={`flex-1 ${checked ? "text-muted-foreground line-through" : "text-foreground"} ${
                    ing.optional ? "italic" : ""
                  }`}
                >
                  {ing.name}
                </span>
                <span className="flex shrink-0 flex-wrap justify-end gap-1">
                  {ing.optional && (
                    <Badge variant="neutral" size="sm">
                      facoltativo
                    </Badge>
                  )}
                  {inPantry.includes(ing.id) && (
                    <Badge variant="accent" size="sm">
                      <Check className="h-3 w-3" aria-hidden="true" /> in dispensa
                    </Badge>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ponytail: seconda pagina che regola le porzioni (modalità cottura) -> stepper estratto qui,
// componente puramente additivo, l'export default sopra resta intatto
export function ServingsStepper({
  servings,
  onChange,
}: {
  servings: number;
  onChange: (servings: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-foreground">Porzioni</label>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onChange(Math.max(1, servings - 1))}
        className="h-9 w-9 px-0"
        aria-label="Diminuisci porzioni"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </Button>
      <input
        type="number"
        min={1}
        value={servings}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
        className={`w-16 py-1.5 text-center ${inputClasses}`}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onChange(servings + 1)}
        className="h-9 w-9 px-0"
        aria-label="Aumenta porzioni"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
