"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IngredientRows, type IngredientRow } from "@/components/IngredientRows";
import { StepRows, type StepRow } from "@/components/StepRows";
import { TagPicker } from "@/components/TagPicker";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

export type RecipeFormData = {
  title: string;
  description: string;
  servingsBase: number;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  sourceUrl: string;
  ingredients: IngredientRow[];
  steps: StepRow[];
  tags: string[];
  photoUrl: string | null;
};

const EMPTY: RecipeFormData = {
  title: "",
  description: "",
  servingsBase: 4,
  prepTimeMinutes: null,
  cookTimeMinutes: null,
  sourceUrl: "",
  ingredients: [],
  steps: [],
  tags: [],
  photoUrl: null,
};

export function RecipeForm({
  recipeId,
  initialData,
}: {
  recipeId?: string;
  initialData?: Partial<RecipeFormData>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<RecipeFormData>({ ...EMPTY, ...initialData });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof RecipeFormData>(key: K, value: RecipeFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body = new FormData();
    body.set("title", form.title);
    body.set("description", form.description);
    body.set("servingsBase", String(form.servingsBase));
    body.set("prepTimeMinutes", form.prepTimeMinutes != null ? String(form.prepTimeMinutes) : "");
    body.set("cookTimeMinutes", form.cookTimeMinutes != null ? String(form.cookTimeMinutes) : "");
    body.set("sourceUrl", form.sourceUrl);
    body.set("ingredients", JSON.stringify(form.ingredients));
    body.set("steps", JSON.stringify(form.steps));
    body.set("tags", JSON.stringify(form.tags));
    if (photoFile) body.set("photo", photoFile);

    const res = await fetch(recipeId ? `/api/recipes/${recipeId}` : "/api/recipes", {
      method: recipeId ? "PATCH" : "POST",
      body,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Errore durante il salvataggio");
      setSaving(false);
      return;
    }

    const saved = await res.json();
    router.push(`/recipes/${saved.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4">
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <Input
        label="Titolo"
        type="text"
        required
        value={form.title}
        onChange={(e) => set("title", e.target.value)}
      />

      <Textarea
        label="Descrizione"
        value={form.description}
        onChange={(e) => set("description", e.target.value)}
        rows={2}
      />

      <div>
        <label className="mb-1 block text-sm font-medium">Foto</label>
        {form.photoUrl && !photoFile && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/uploads/${form.photoUrl}`}
            alt={form.title || "Foto ricetta"}
            className="mb-2 h-40 w-40 rounded-lg object-cover"
          />
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-muted-foreground"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Porzioni base"
          type="number"
          min={1}
          required
          value={form.servingsBase}
          onChange={(e) => set("servingsBase", Number(e.target.value))}
        />
        <Input
          label="Prep. (min)"
          type="number"
          min={0}
          value={form.prepTimeMinutes ?? ""}
          onChange={(e) => set("prepTimeMinutes", e.target.value ? Number(e.target.value) : null)}
        />
        <Input
          label="Cottura (min)"
          type="number"
          min={0}
          value={form.cookTimeMinutes ?? ""}
          onChange={(e) => set("cookTimeMinutes", e.target.value ? Number(e.target.value) : null)}
        />
      </div>

      <Input
        label="Link fonte (opzionale)"
        type="url"
        value={form.sourceUrl}
        onChange={(e) => set("sourceUrl", e.target.value)}
      />

      <div>
        <label className="mb-1 block text-sm font-medium">Ingredienti</label>
        <IngredientRows value={form.ingredients} onChange={(v) => set("ingredients", v)} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Passaggi</label>
        <StepRows value={form.steps} onChange={(v) => set("steps", v)} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Tag</label>
        <TagPicker value={form.tags} onChange={(v) => set("tags", v)} />
      </div>

      <Button type="submit" size="lg" disabled={saving} className="w-full">
        {saving ? "Salvataggio..." : "Salva ricetta"}
      </Button>
    </form>
  );
}
