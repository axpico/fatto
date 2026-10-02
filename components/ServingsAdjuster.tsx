"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { scaleQuantity } from "@/lib/scaling";
import { applyUnitPreference } from "@/lib/units";
import { useUnitPreference } from "@/lib/unitPreference";
import { useRecipeServings } from "@/lib/recipeServings";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Checkbox";
import { UnitToggle } from "@/components/UnitToggle";

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

// stepper -/input/+ condiviso da ServingsAdjuster (pagina ricetta) e ServingsStepper (modalità
// cottura), che differiscono solo per lo stile dell'input e per un'etichetta opzionale
function ServingsStepperCore({
  servings,
  onChange,
  inputClassName = "w-16 py-1.5 text-center",
}: {
  servings: number;
  onChange: (servings: number) => void;
  inputClassName?: string;
}) {
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onChange(Math.max(1, servings - 1))}
        className="h-11 w-11 px-0"
        aria-label="Diminuisci porzioni"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </Button>
      <input
        type="number"
        min={1}
        value={servings}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
        className={`${inputClassName} ${inputClasses}`}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onChange(servings + 1)}
        className="h-11 w-11 px-0"
        aria-label="Aumenta porzioni"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </Button>
    </>
  );
}

export function ServingsAdjuster({
  recipeId,
  baseServings,
  ingredients,
}: {
  recipeId: string;
  baseServings: number;
  ingredients: Ingredient[];
}) {
  const [servings, setServings] = useRecipeServings(recipeId, baseServings);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [useMetric] = useUnitPreference();

  function toggleChecked(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-secondary p-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Porzioni</p>
          <p className="text-xs text-muted-foreground">Le quantità si aggiornano automaticamente.</p>
        </div>
        <div className="flex items-center gap-2">
          <ServingsStepperCore
            servings={servings}
            onChange={setServings}
            inputClassName="h-11 w-14 py-1 text-center font-semibold tabular-nums"
          />
        </div>
        <UnitToggle />
      </div>

      <ul className="space-y-2" aria-label={`Ingredienti per ${servings} porzioni`}>
        {ingredients.map((ing) => {
          const scaled = scaleQuantity(ing.quantity, baseServings, servings);
          const display = scaled !== null ? applyUnitPreference(scaled, ing.unit, useMetric, ing.name) : null;
          const checked = checkedIds.has(ing.id);
          return (
            <li key={ing.id}>
              <label className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-[background-color,border-color,box-shadow] duration-200 ${
                checked ? "border-border bg-surface-secondary/70" : "border-border bg-surface hover:border-border-strong hover:shadow-sm"
              }`}>
                <Checkbox checked={checked} onChange={() => toggleChecked(ing.id)} className="mt-0.5 h-5 w-5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className={`block font-medium leading-6 ${checked ? "text-muted-foreground line-through" : "text-foreground"} ${ing.optional ? "italic" : ""}`}>
                    {ing.name}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                  {ing.optional && (
                    <Badge variant="neutral" size="sm">
                      facoltativo
                    </Badge>
                  )}
                  </span>
                </span>
                {display !== null && (
                  <span
                    key={servings}
                    className={`value-pulse shrink-0 rounded-md bg-surface-secondary px-2 py-1 text-sm font-semibold tabular-nums ${checked ? "text-muted-foreground" : "text-foreground"}`}
                  >
                    {formatQuantity(display.quantity)} <span className="text-xs font-medium text-muted-foreground">{display.unit ?? ""}</span>
                  </span>
                )}
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
      <ServingsStepperCore servings={servings} onChange={onChange} />
    </div>
  );
}
