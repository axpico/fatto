"use client";

import { useState } from "react";
import { Minus, Plus, Check } from "lucide-react";
import { scaleQuantity } from "@/lib/scaling";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

type Ingredient = { id: string; name: string; quantity: number | null; unit: string | null };

function formatQuantity(n: number) {
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

      <ul className="space-y-1.5">
        {ingredients.map((ing) => {
          const scaled = scaleQuantity(ing.quantity, baseServings, servings);
          return (
            <li key={ing.id} className="flex gap-2 text-foreground">
              {scaled !== null && (
                <span className="w-20 shrink-0 text-right font-medium">
                  {formatQuantity(scaled)} {ing.unit ?? ""}
                </span>
              )}
              <span>{ing.name}</span>
              {inPantry.includes(ing.id) && (
                <Badge variant="accent">
                  <Check className="h-3 w-3" aria-hidden="true" /> in dispensa
                </Badge>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
