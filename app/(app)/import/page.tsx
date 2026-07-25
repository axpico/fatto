"use client";

import { useState } from "react";
import { RecipeForm, type RecipeFormData } from "@/components/RecipeForm";
import type { ExtractedRecipe } from "@/lib/ai/schema";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

function mapExtractedToFormData(extracted: ExtractedRecipe): Partial<RecipeFormData> {
  return {
    title: extracted.title,
    servingsBase: extracted.servings ?? 4,
    prepTimeMinutes: extracted.prep_time_minutes,
    cookTimeMinutes: extracted.cook_time_minutes,
    ingredients: extracted.ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
    })),
    steps: extracted.steps.map((s) => ({
      instruction: s.instruction,
      timerMinutes: s.timer_minutes,
    })),
  };
}

export default function ImportPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<Partial<RecipeFormData> | null>(null);
  const [manual, setManual] = useState(false);

  async function importFromUrl(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/import/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Importazione fallita");
      return;
    }
    setExtracted(mapExtractedToFormData(data));
  }

  async function importFromFile(file: File) {
    setLoading(true);
    setError(null);
    const body = new FormData();
    body.set("file", file);
    const res = await fetch("/api/import/file", { method: "POST", body });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Importazione fallita");
      return;
    }
    setExtracted(mapExtractedToFormData(data));
  }

  if (extracted || manual) {
    return (
      <div>
        <h1 className="px-4 pt-4 text-lg font-semibold text-foreground">Rivedi e salva</h1>
        <p className="px-4 text-sm text-muted-foreground">
          Controlla i dati estratti prima di salvare: l&apos;AI può sbagliare.
        </p>
        <RecipeForm initialData={extracted ?? undefined} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-lg font-semibold text-foreground">Importa ricetta</h1>

      {error && (
        <div className="space-y-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <p>{error}</p>
          <button type="button" onClick={() => setManual(true)} className="font-medium underline">
            Inserisci manualmente
          </button>
        </div>
      )}

      <form onSubmit={importFromUrl} className="space-y-2">
        <label className="block text-sm font-medium">Da un link</label>
        <div className="flex gap-2">
          <Input
            type="url"
            required
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={loading}>
            Importa
          </Button>
        </div>
      </form>

      <div>
        <label className="mb-2 block text-sm font-medium">Da uno screenshot o PDF</label>
        <input
          type="file"
          accept="image/*,application/pdf"
          disabled={loading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importFromFile(file);
          }}
          className="block w-full text-sm text-muted-foreground"
        />
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Estrazione in corso...
        </p>
      )}

      <button
        type="button"
        onClick={() => setManual(true)}
        className="text-sm text-muted-foreground underline hover:text-foreground"
      >
        Oppure inserisci la ricetta manualmente
      </button>
    </div>
  );
}
