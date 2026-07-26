"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { reportIfFailed } from "@/lib/apiError";

type MealSlot = "COLAZIONE" | "PRANZO" | "CENA";
const SLOTS: { value: MealSlot; label: string }[] = [
  { value: "COLAZIONE", label: "Colazione" },
  { value: "PRANZO", label: "Pranzo" },
  { value: "CENA", label: "Cena" },
];

type Entry = {
  id: string;
  recipeId: string;
  plannedDate: string; // YYYY-MM-DD
  mealSlot: MealSlot;
  recipe: { id: string; title: string };
};

type RecipeOption = { id: string; title: string };

function formatDay(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "short" });
}

export function MealPlanCalendar({
  weekDates,
  initialEntries,
  recipes,
}: {
  weekDates: string[];
  initialEntries: Entry[];
  recipes: RecipeOption[];
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [addingCell, setAddingCell] = useState<string | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const toast = useToast();

  function cellKey(date: string, slot: MealSlot) {
    return `${date}::${slot}`;
  }

  async function assign(date: string, slot: MealSlot) {
    if (!selectedRecipeId) return;
    const res = await fetch("/api/meal-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeId: selectedRecipeId, plannedDate: date, mealSlot: slot }),
    });
    setAddingCell(null);
    setSelectedRecipeId("");
    if (await reportIfFailed(res, toast)) return;
    const entry = await res.json();
    setEntries((prev) => [...prev, entry]);
  }

  async function unassign(id: string) {
    const previous = entries;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    const res = await fetch(`/api/meal-plan/${id}`, { method: "DELETE" });
    if (await reportIfFailed(res, toast)) setEntries(previous);
  }

  return (
    <div className="space-y-4">
      {weekDates.map((date) => (
        <Card key={date} className="p-3">
          <h3 className="mb-2 text-sm font-semibold capitalize text-foreground">{formatDay(date)}</h3>
          <div className="space-y-2">
            {SLOTS.map((slot) => {
              const key = cellKey(date, slot.value);
              const slotEntries = entries.filter(
                (e) => e.plannedDate.slice(0, 10) === date && e.mealSlot === slot.value,
              );
              return (
                <div key={slot.value} className="flex flex-wrap items-center gap-2">
                  <span className="w-20 shrink-0 text-xs text-muted-foreground">{slot.label}</span>
                  {slotEntries.map((entry) => (
                    <Badge key={entry.id} variant="accent" size="md">
                      {entry.recipe.title}
                      <button
                        type="button"
                        onClick={() => unassign(entry.id)}
                        aria-label="Rimuovi"
                        className="text-primary/70 hover:text-primary"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </Badge>
                  ))}
                  {addingCell === key ? (
                    <span className="flex items-center gap-1">
                      <select
                        autoFocus
                        aria-label="Scegli ricetta"
                        value={selectedRecipeId}
                        onChange={(e) => setSelectedRecipeId(e.target.value)}
                        className={`${inputClasses} px-2 py-1 text-xs`}
                      >
                        <option value="">Scegli...</option>
                        {recipes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.title}
                          </option>
                        ))}
                      </select>
                      <Button type="button" variant="ghost" size="sm" onClick={() => assign(date, slot.value)} className="px-2 text-xs text-primary">
                        Aggiungi
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setAddingCell(null)} className="px-2 text-xs">
                        Annulla
                      </Button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingCell(key)}
                      className="text-xs text-muted-foreground hover:text-primary"
                    >
                      + aggiungi
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
