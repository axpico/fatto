"use client";

import { useState } from "react";
import { scaleQuantity } from "@/lib/scaling";
import { applyUnitPreference } from "@/lib/units";
import { useUnitPreference } from "@/lib/unitPreference";
import { formatQuantity, ServingsStepper } from "@/components/ServingsAdjuster";
import { UnitToggle } from "@/components/UnitToggle";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const NUTRITION_FIELDS: { key: "caloriesKcal" | "proteinG" | "carbsG" | "fatG" | "fiberG" | "sugarG" | "saturatedFatG" | "sodiumMg"; label: string; unit: string }[] = [
  { key: "caloriesKcal", label: "Calorie", unit: " kcal" },
  { key: "proteinG", label: "Proteine", unit: " g" },
  { key: "carbsG", label: "Carboidrati", unit: " g" },
  { key: "fatG", label: "Grassi", unit: " g" },
  { key: "fiberG", label: "Fibre", unit: " g" },
  { key: "sugarG", label: "Zuccheri", unit: " g" },
  { key: "saturatedFatG", label: "di cui saturi", unit: " g" },
  { key: "sodiumMg", label: "Sodio", unit: " mg" },
];

type Recipe = {
  id: string;
  title: string;
  description: string | null;
  photoUrl: string | null;
  servingsBase: number;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  sourceUrl: string | null;
  equipment: string[];
  ingredients: { id: string; name: string; quantity: number | null; unit: string | null; optional: boolean }[];
  steps: { id: string; instruction: string; timerMinutes: number | null; optional: boolean }[];
  tags: { id: string; name: string }[];
  nutrition: {
    caloriesKcal: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
    fiberG: number | null;
    sugarG: number | null;
    saturatedFatG: number | null;
    sodiumMg: number | null;
  } | null;
};

export function PrintView({ recipe, qrDataUrl }: { recipe: Recipe; qrDataUrl: string }) {
  const [servings, setServings] = useState(recipe.servingsBase);
  const [useMetric, toggleUnit] = useUnitPreference();
  const totalMinutes =
    recipe.prepTimeMinutes != null && recipe.cookTimeMinutes != null
      ? recipe.prepTimeMinutes + recipe.cookTimeMinutes
      : null;

  return (
    <div className="mx-auto min-h-screen max-w-3xl bg-surface p-5 text-foreground sm:my-8 sm:rounded-xl sm:border sm:border-border sm:p-8 sm:shadow-sm print:my-0 print:max-w-none print:p-0">
      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <ServingsStepper servings={servings} onChange={setServings} />
        <UnitToggle useMetric={useMetric} onToggle={toggleUnit} />
        <Button type="button" variant="secondary" onClick={() => window.print()}>
          Stampa / Salva PDF
        </Button>
      </div>

      {recipe.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/uploads/${recipe.photoUrl}`}
          alt={recipe.title}
          className="mb-4 h-56 w-full rounded-lg object-cover print:break-inside-avoid"
        />
      )}

      <h1 className="font-display text-3xl font-semibold tracking-tight">{recipe.title}</h1>
      {recipe.description && <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">{recipe.description}</p>}

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span>Porzioni: {servings}</span>
        {recipe.prepTimeMinutes != null && <span>Prep: {recipe.prepTimeMinutes} min</span>}
        {recipe.cookTimeMinutes != null && <span>Cottura: {recipe.cookTimeMinutes} min</span>}
        {totalMinutes != null && <span>Totale: {totalMinutes} min</span>}
      </div>

      {recipe.tags.length > 0 && (
        <p className="mt-1 text-sm text-muted-foreground">
          {recipe.tags.map((t) => t.name).join(" · ")}
        </p>
      )}

      <hr className="my-6 border-border" />

      {recipe.equipment.length > 0 && (
        <section className="break-inside-avoid">
          <h2 className="font-display text-xl font-semibold">Attrezzatura</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {recipe.equipment.map((item) => (
              <Badge key={item}>{item}</Badge>
            ))}
          </div>
        </section>
      )}

      <h2 className="mt-8 font-display text-xl font-semibold">Ingredienti</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {recipe.ingredients.map((ing) => {
          const scaled = scaleQuantity(ing.quantity, recipe.servingsBase, servings);
          const display = scaled != null ? applyUnitPreference(scaled, ing.unit, useMetric) : null;
          return (
            <li key={ing.id} className="break-inside-avoid">
              {display != null && (
                <strong>
                  {formatQuantity(display.quantity)} {display.unit ?? ""}{" "}
                </strong>
              )}
              {ing.name}
              {ing.optional && " (facoltativo)"}
            </li>
          );
        })}
      </ul>

      <h2 className="mt-8 font-display text-xl font-semibold">Passaggi</h2>
      <ol className="mt-2 list-decimal space-y-2 pl-5">
        {recipe.steps.map((step) => (
          <li key={step.id} className="break-inside-avoid">
            {step.instruction}
            {step.timerMinutes != null && ` (${step.timerMinutes} min)`}
            {step.optional && " (facoltativo)"}
          </li>
        ))}
      </ol>

      {recipe.nutrition && (
        <section className="mt-6 break-inside-avoid">
          <h2 className="font-display text-xl font-semibold">Valori nutrizionali (per porzione)</h2>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {NUTRITION_FIELDS.map(({ key, label, unit }) => {
              const value = recipe.nutrition![key];
              if (value == null) return null;
              return (
                <div key={key} className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium text-foreground">
                    {value}
                    {unit}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      )}

      <div className="mt-8 flex items-center justify-between gap-4 border-t border-border pt-4 break-inside-avoid">
        {recipe.sourceUrl ? (
          <p className="text-xs text-muted-foreground">Fonte: {recipe.sourceUrl}</p>
        ) : (
          <span />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="Link alla ricetta" className="h-20 w-20 shrink-0" />
      </div>
    </div>
  );
}
