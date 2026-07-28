"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { IngredientRows, type IngredientRow } from "@/components/IngredientRows";
import { StepRows, type StepRow } from "@/components/StepRows";
import { TagPicker } from "@/components/TagPicker";
import { EquipmentPicker } from "@/components/EquipmentPicker";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";

export type NutritionData = {
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  saturatedFatG: number | null;
  sodiumMg: number | null;
};

export type GalleryImage =
  | { kind: "existing"; filename: string }
  | { kind: "new"; file: File; previewUrl: string };

export type RecipeFormData = {
  title: string;
  description: string;
  servingsBase: number;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  sourceUrl: string;
  videoUrl: string;
  equipment: string[];
  nutrition: NutritionData;
  ingredients: IngredientRow[];
  steps: StepRow[];
  tags: string[];
  photoUrl: string | null;
  gallery: GalleryImage[];
};

const EMPTY_NUTRITION: NutritionData = {
  caloriesKcal: null,
  proteinG: null,
  carbsG: null,
  fatG: null,
  fiberG: null,
  sugarG: null,
  saturatedFatG: null,
  sodiumMg: null,
};

const EMPTY: RecipeFormData = {
  title: "",
  description: "",
  servingsBase: 4,
  prepTimeMinutes: null,
  cookTimeMinutes: null,
  sourceUrl: "",
  videoUrl: "",
  equipment: [],
  nutrition: EMPTY_NUTRITION,
  ingredients: [],
  steps: [],
  tags: [],
  photoUrl: null,
  gallery: [],
};

const NUTRITION_FIELDS: { key: keyof NutritionData; label: string }[] = [
  { key: "caloriesKcal", label: "Calorie (kcal)" },
  { key: "proteinG", label: "Proteine (g)" },
  { key: "carbsG", label: "Carboidrati (g)" },
  { key: "fatG", label: "Grassi (g)" },
  { key: "fiberG", label: "Fibre (g)" },
  { key: "sugarG", label: "Zuccheri (g)" },
  { key: "saturatedFatG", label: "Grassi saturi (g)" },
  { key: "sodiumMg", label: "Sodio (mg)" },
];

const SECTIONS = [
  { value: "base", label: "Base" },
  { value: "ingredienti", label: "Ingredienti" },
  { value: "passaggi", label: "Passaggi" },
  { value: "extra", label: "Extra" },
];

const fileInputClasses =
  "block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-primary-hover";

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
  const [activeSection, setActiveSection] = useState("base");

  // baseline snapshot for the unsaved-changes check below; captured once at mount
  const initialFormRef = useRef(form);
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    // ponytail: only guards browser unload, not in-app navigation (no stable
    // App Router hook for that without experimental APIs)
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (JSON.stringify(formRef.current) !== JSON.stringify(initialFormRef.current)) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  function set<K extends keyof RecipeFormData>(key: K, value: RecipeFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setNutrition<K extends keyof NutritionData>(key: K, value: NutritionData[K]) {
    setForm((f) => ({ ...f, nutrition: { ...f.nutrition, [key]: value } }));
  }

  function addGalleryFiles(files: FileList | null) {
    if (!files) return;
    const additions: GalleryImage[] = Array.from(files).map((file) => ({
      kind: "new",
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setForm((f) => ({ ...f, gallery: [...f.gallery, ...additions] }));
  }

  function removeGalleryItem(index: number) {
    setForm((f) => ({ ...f, gallery: f.gallery.filter((_, i) => i !== index) }));
  }

  function moveGalleryItem(index: number, direction: -1 | 1) {
    setForm((f) => {
      const target = index + direction;
      if (target < 0 || target >= f.gallery.length) return f;
      const gallery = [...f.gallery];
      [gallery[index], gallery[target]] = [gallery[target], gallery[index]];
      return { ...f, gallery };
    });
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
    body.set("videoUrl", form.videoUrl);
    body.set("equipment", JSON.stringify(form.equipment));
    body.set("nutrition", JSON.stringify(form.nutrition));
    body.set("ingredients", JSON.stringify(form.ingredients));
    body.set(
      "steps",
      JSON.stringify(
        form.steps.map((s) => ({
          instruction: s.instruction,
          timerMinutes: s.timerMinutes,
          optional: s.optional,
          imageFilename: s.imageFilename,
        })),
      ),
    );
    form.steps.forEach((s, i) => {
      if (s.imageFile) body.append(`stepImage_${i}`, s.imageFile);
    });
    body.set("tags", JSON.stringify(form.tags));
    if (photoFile) body.set("photo", photoFile);
    else if (form.photoUrl) body.set("existingPhotoUrl", form.photoUrl);
    body.set(
      "galleryExisting",
      JSON.stringify(form.gallery.filter((g) => g.kind === "existing").map((g) => g.filename)),
    );
    for (const item of form.gallery) {
      if (item.kind === "new") body.append("galleryPhotos", item.file);
    }

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
    <form onSubmit={handleSubmit} className="space-y-5 pb-24">
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <Tabs tabs={SECTIONS} value={activeSection} onChange={setActiveSection} aria-label="Sezioni ricetta" />

      {activeSection === "base" && (
        <Card role="tabpanel" id="panel-base" aria-labelledby="tab-base" className="space-y-4 p-4">
          <Input
            label="Titolo"
            id="title"
            type="text"
            required
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />

          <Textarea
            label="Descrizione"
            id="description"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
          />

          <fieldset>
            <legend className="mb-1 text-sm font-medium">Foto</legend>
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
              className={fileInputClasses}
            />
          </fieldset>

          <fieldset>
            <legend className="mb-1 text-sm font-medium">Galleria foto</legend>
            {form.gallery.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {form.gallery.map((item, index) => (
                  <div key={index} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.kind === "existing" ? `/api/uploads/${item.filename}` : item.previewUrl}
                      alt=""
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeGalleryItem(index)}
                      aria-label="Rimuovi foto dalla galleria"
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-white"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <div className="absolute -bottom-1.5 left-1/2 flex -translate-x-1/2 gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveGalleryItem(index, -1)}
                        disabled={index === 0}
                        aria-label="Sposta foto a sinistra"
                        className="rounded-full bg-surface p-0.5 text-foreground shadow disabled:opacity-30"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveGalleryItem(index, 1)}
                        disabled={index === form.gallery.length - 1}
                        aria-label="Sposta foto a destra"
                        className="rounded-full bg-surface p-0.5 text-foreground shadow disabled:opacity-30"
                      >
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                addGalleryFiles(e.target.files);
                e.target.value = "";
              }}
              className={fileInputClasses}
            />
          </fieldset>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Porzioni base"
              id="servingsBase"
              type="number"
              min={1}
              required
              value={form.servingsBase}
              onChange={(e) => set("servingsBase", Number(e.target.value))}
            />
            <Input
              label="Prep. (min)"
              id="prepTimeMinutes"
              type="number"
              min={0}
              value={form.prepTimeMinutes ?? ""}
              onChange={(e) => set("prepTimeMinutes", e.target.value ? Number(e.target.value) : null)}
            />
            <Input
              label="Cottura (min)"
              id="cookTimeMinutes"
              type="number"
              min={0}
              value={form.cookTimeMinutes ?? ""}
              onChange={(e) => set("cookTimeMinutes", e.target.value ? Number(e.target.value) : null)}
            />
          </div>

          <Input
            label="Link fonte (opzionale)"
            id="sourceUrl"
            type="url"
            value={form.sourceUrl}
            onChange={(e) => set("sourceUrl", e.target.value)}
          />

          <Input
            label="Link video (opzionale)"
            id="videoUrl"
            type="url"
            placeholder="https://..."
            value={form.videoUrl}
            onChange={(e) => set("videoUrl", e.target.value)}
          />
        </Card>
      )}

      {activeSection === "ingredienti" && (
        <Card
          role="tabpanel"
          id="panel-ingredienti"
          aria-labelledby="tab-ingredienti"
          className="space-y-4 p-4"
        >
          <fieldset>
            <legend className="mb-1 text-sm font-medium">Ingredienti</legend>
            <IngredientRows value={form.ingredients} onChange={(v) => set("ingredients", v)} />
          </fieldset>

          <fieldset>
            <legend className="mb-1 text-sm font-medium">Attrezzatura</legend>
            <EquipmentPicker value={form.equipment} onChange={(v) => set("equipment", v)} />
          </fieldset>
        </Card>
      )}

      {activeSection === "passaggi" && (
        <Card role="tabpanel" id="panel-passaggi" aria-labelledby="tab-passaggi" className="p-4">
          <fieldset>
            <legend className="mb-1 text-sm font-medium">Passaggi</legend>
            <StepRows value={form.steps} onChange={(v) => set("steps", v)} />
          </fieldset>
        </Card>
      )}

      {activeSection === "extra" && (
        <Card role="tabpanel" id="panel-extra" aria-labelledby="tab-extra" className="space-y-4 p-4">
          <fieldset>
            <legend className="mb-1 text-sm font-medium">Valori nutrizionali (per porzione)</legend>
            <div className="grid grid-cols-3 gap-3">
              {NUTRITION_FIELDS.map(({ key, label }) => (
                <Input
                  key={key}
                  label={label}
                  id={`nutrition-${key}`}
                  type="number"
                  min={0}
                  step="any"
                  value={form.nutrition[key] ?? ""}
                  onChange={(e) => setNutrition(key, e.target.value ? Number(e.target.value) : null)}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-1 text-sm font-medium">Tag</legend>
            <TagPicker value={form.tags} onChange={(v) => set("tags", v)} />
          </fieldset>
        </Card>
      )}

      <div className="fixed inset-x-0 bottom-16 z-10 border-t border-border bg-surface/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:bottom-0">
        <div className="mx-auto w-full max-w-5xl">
          <Button type="submit" size="lg" disabled={saving} className="w-full">
            {saving ? "Salvataggio..." : "Salva ricetta"}
          </Button>
        </div>
      </div>
    </form>
  );
}
