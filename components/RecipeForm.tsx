"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { IngredientRows, type IngredientRow } from "@/components/IngredientRows";
import { StepRows, type StepRow } from "@/components/StepRows";
import { TagPicker } from "@/components/TagPicker";
import { EquipmentPicker } from "@/components/EquipmentPicker";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { ConfirmDialog, type ConfirmDialogHandle } from "@/components/ui/ConfirmDialog";
import { NUTRITION_FIELDS } from "@/lib/nutrition";
import { readErrorMessage } from "@/lib/clientFetch";

type NutritionData = {
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  saturatedFatG: number | null;
  sodiumMg: number | null;
};

type GalleryImage =
  | { kind: "existing"; filename: string }
  | { kind: "new"; file: File; previewUrl: string };

export type RecipeFormData = {
  title: string;
  description: string;
  servingsBase: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  sourceUrl: string;
  videoUrl: string;
  equipment: string[];
  nutrition: NutritionData;
  ingredients: IngredientRow[];
  steps: StepRow[];
  tags: string[];
  /** Prima foto = copertina (Recipe.photoUrl), le altre = galleria (RecipeImage). */
  photos: GalleryImage[];
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
  photos: [],
};

const SECTIONS = [
  { value: "base", label: "Base" },
  { value: "ingredienti", label: "Ingredienti" },
  { value: "passaggi", label: "Passaggi" },
  { value: "extra", label: "Extra" },
];

const fileInputClasses =
  "block w-full text-sm text-muted-foreground file:mr-3 file:min-h-10 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-primary-hover";

export function RecipeForm({
  recipeId,
  initialData,
  backHref = "/",
}: {
  recipeId?: string;
  initialData?: Partial<RecipeFormData>;
  backHref?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<RecipeFormData>({ ...EMPTY, ...initialData });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("base");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const backDialogRef = useRef<ConfirmDialogHandle>(null);
  // sticky flag (not state — doesn't need to trigger a render on its own): title should be
  // focused once the "base" tab panel remounts after a validation failure
  const focusTitleRef = useRef(false);

  // baseline snapshot for the unsaved-changes check below; frozen at mount (useState ignores
  // the initializer on later renders), safe to read during render unlike a ref
  const [initialForm] = useState(form);
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  useEffect(() => {
    // ponytail: only guards browser unload, not in-app navigation (see
    // handleBackClick below for the in-app case, via ConfirmDialog)
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (JSON.stringify(formRef.current) !== JSON.stringify(initialForm)) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [initialForm]);

  // tabs unmount inactive panels, so switching to "base" on validation failure
  // needs a tick before the title input exists in the DOM to focus
  useEffect(() => {
    if (focusTitleRef.current && activeSection === "base") {
      titleInputRef.current?.focus();
      focusTitleRef.current = false;
    }
  }, [activeSection]);

  async function handleBackClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!isDirty) return;
    e.preventDefault();
    const confirmed = await backDialogRef.current?.open();
    if (confirmed) router.push(backHref);
  }

  function set<K extends keyof RecipeFormData>(key: K, value: RecipeFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setNutrition<K extends keyof NutritionData>(key: K, value: NutritionData[K]) {
    setForm((f) => ({ ...f, nutrition: { ...f.nutrition, [key]: value } }));
  }

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const additions: GalleryImage[] = Array.from(files).map((file) => ({
      kind: "new",
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setForm((f) => ({ ...f, photos: [...f.photos, ...additions] }));
  }

  function removePhoto(index: number) {
    setForm((f) => ({ ...f, photos: f.photos.filter((_, i) => i !== index) }));
  }

  function movePhoto(index: number, direction: -1 | 1) {
    setForm((f) => {
      const target = index + direction;
      if (target < 0 || target >= f.photos.length) return f;
      const photos = [...f.photos];
      [photos[index], photos[target]] = [photos[target], photos[index]];
      return { ...f, photos };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title.trim()) {
      setError("Titolo obbligatorio");
      focusTitleRef.current = true;
      setActiveSection("base");
      return;
    }
    if (!form.servingsBase || form.servingsBase < 1) {
      setError("Porzioni obbligatorie");
      setActiveSection("base");
      return;
    }

    setSaving(true);
    setError(null);

    const body = new FormData();
    body.set("title", form.title);
    body.set("description", form.description);
    body.set("servingsBase", String(form.servingsBase ?? ""));
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
    const [cover, ...gallery] = form.photos;
    if (cover?.kind === "new") body.set("photo", cover.file);
    else if (cover?.kind === "existing") body.set("existingPhotoUrl", cover.filename);
    body.set(
      "galleryExisting",
      JSON.stringify(gallery.filter((g) => g.kind === "existing").map((g) => g.filename)),
    );
    for (const item of gallery) {
      if (item.kind === "new") body.append("galleryPhotos", item.file);
    }

    const res = await fetch(recipeId ? `/api/recipes/${recipeId}` : "/api/recipes", {
      method: recipeId ? "PATCH" : "POST",
      body,
    });

    if (!res.ok) {
      setError(await readErrorMessage(res, "Errore durante il salvataggio"));
      setSaving(false);
      return;
    }

    const saved = await res.json();
    router.push(`/recipes/${saved.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-24">
      <Link
        href={backHref}
        onClick={handleBackClick}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {recipeId ? "Torna alla ricetta" : "Torna alle ricette"}
      </Link>
      <ConfirmDialog
        ref={backDialogRef}
        title="Uscire senza salvare?"
        description="Hai modifiche non salvate. Uscire senza salvare?"
        confirmLabel="Esci senza salvare"
      />

      {error && <ErrorBanner className="animate-[shake_400ms_ease-in-out]">{error}</ErrorBanner>}

      <Tabs tabs={SECTIONS} value={activeSection} onChange={setActiveSection} aria-label="Sezioni ricetta" />

      {activeSection === "base" && (
        <Card role="tabpanel" id="panel-base" aria-labelledby="tab-base" className="space-y-4 p-4">
          <Input
            ref={titleInputRef}
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
            <p className="mb-2 text-xs text-muted-foreground">La prima foto è la copertina.</p>
            {form.photos.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-3">
                {form.photos.map((item, index) => (
                  <div key={index} className="relative pb-3 pr-1 pt-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.kind === "existing" ? `/api/uploads/${item.filename}` : item.previewUrl}
                      alt=""
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                    {index === 0 && (
                      <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                        Copertina
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      aria-label="Rimuovi foto"
                      className="absolute -right-1 -top-1 flex min-h-9 min-w-9 items-center justify-center rounded-full bg-destructive text-white"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <div className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => movePhoto(index, -1)}
                        disabled={index === 0}
                        aria-label="Sposta foto a sinistra"
                        className="flex min-h-9 min-w-9 items-center justify-center rounded-full bg-surface text-foreground shadow disabled:opacity-30"
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => movePhoto(index, 1)}
                        disabled={index === form.photos.length - 1}
                        aria-label="Sposta foto a destra"
                        className="flex min-h-9 min-w-9 items-center justify-center rounded-full bg-surface text-foreground shadow disabled:opacity-30"
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
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
                addPhotos(e.target.files);
                e.target.value = "";
              }}
              className={fileInputClasses}
            />
          </fieldset>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Input
              label="Porzioni base"
              id="servingsBase"
              type="number"
              min={1}
              required
              value={form.servingsBase ?? ""}
              onChange={(e) => set("servingsBase", e.target.value ? Number(e.target.value) : null)}
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {NUTRITION_FIELDS.map(({ key, label, unit }) => (
                <Input
                  key={key}
                  label={`${label} (${unit})`}
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
