"use client";

import { useState } from "react";
import { Link2, Image as ImageIcon, Video, Upload, CheckCircle2, TriangleAlert } from "lucide-react";
import { RecipeForm, type RecipeFormData } from "@/components/RecipeForm";
import type { ExtractedRecipe } from "@/lib/ai/schema";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";

const LANGUAGES = [
  { code: "italiano", label: "Italiano" },
  { code: "inglese", label: "Inglese" },
  { code: "spagnolo", label: "Spagnolo" },
  { code: "francese", label: "Francese" },
  { code: "tedesco", label: "Tedesco" },
];

const IMPORT_TABS = [
  { value: "link", label: "Link" },
  { value: "file", label: "Screenshot/PDF" },
  { value: "reel", label: "Reel" },
];

type ImportedRecipe = ExtractedRecipe & { photoUrl?: string | null };

function mapExtractedToFormData(extracted: ImportedRecipe, sourceUrl?: string): Partial<RecipeFormData> {
  const n = extracted.nutrition;
  return {
    title: extracted.title,
    description: extracted.description ?? "",
    tags: extracted.tags,
    equipment: extracted.equipment,
    sourceUrl: sourceUrl ?? "",
    videoUrl: "",
    photoUrl: extracted.photoUrl ?? null,
    nutrition: {
      caloriesKcal: n?.calories ?? null,
      proteinG: n?.protein_g ?? null,
      carbsG: n?.carbs_g ?? null,
      fatG: n?.fat_g ?? null,
      fiberG: n?.fiber_g ?? null,
      sugarG: n?.sugar_g ?? null,
      saturatedFatG: n?.saturated_fat_g ?? null,
      sodiumMg: n?.sodium_mg ?? null,
    },
    servingsBase: extracted.servings ?? 4,
    prepTimeMinutes: extracted.prep_time_minutes,
    cookTimeMinutes: extracted.cook_time_minutes,
    ingredients: extracted.ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      optional: i.optional,
    })),
    steps: extracted.steps.map((s) => ({
      instruction: s.instruction,
      timerMinutes: s.timer_minutes,
      optional: s.optional,
    })),
  };
}

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState("link");
  const [url, setUrl] = useState("");
  const [reelUrl, setReelUrl] = useState("");
  const [reelNotes, setReelNotes] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Estrazione in corso...");
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<Partial<RecipeFormData> | null>(null);
  const [manual, setManual] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState(LANGUAGES[0].code);
  const [translating, setTranslating] = useState(false);
  const [formKey, setFormKey] = useState(0);

  async function importFromUrl(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setLoadingLabel("Estrazione in corso...");
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
    setProvider(data.provider ?? null);
    setExtracted(mapExtractedToFormData(data, url));
  }

  async function importFromFile(file: File) {
    setLoading(true);
    setLoadingLabel("Estrazione in corso...");
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
    setProvider(data.provider ?? null);
    setExtracted(mapExtractedToFormData(data));
  }

  async function importFromReel(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setLoadingLabel("Scaricando video...");
    setError(null);

    const res = await fetch("/api/import/reel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: reelUrl, notes: reelNotes || undefined }),
    });

    if (!res.ok || !res.body) {
      setLoading(false);
      setError("Importazione fallita");
      return;
    }

    type ReelStreamLine =
      | { stage: string }
      | ({ done: true; error: string })
      | (ExtractedRecipe & { done: true; provider?: string });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalLine: ReelStreamLine | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const parsed: ReelStreamLine = JSON.parse(line);
        if ("stage" in parsed) setLoadingLabel(parsed.stage);
        else finalLine = parsed;
      }
    }

    setLoading(false);
    if (!finalLine || "error" in finalLine) {
      setError((finalLine as { error?: string } | null)?.error ?? "Importazione fallita");
      return;
    }
    setProvider(finalLine.provider ?? null);
    setExtracted(mapExtractedToFormData(finalLine, reelUrl));
  }

  async function translate() {
    if (!extracted) return;
    setTranslating(true);
    setError(null);
    const res = await fetch("/api/import/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: extracted.title ?? "",
        description: extracted.description ?? "",
        servingsBase: extracted.servingsBase ?? 4,
        prepTimeMinutes: extracted.prepTimeMinutes ?? null,
        cookTimeMinutes: extracted.cookTimeMinutes ?? null,
        sourceUrl: extracted.sourceUrl ?? "",
        videoUrl: extracted.videoUrl ?? "",
        equipment: extracted.equipment ?? [],
        nutrition: extracted.nutrition ?? {
          caloriesKcal: null,
          proteinG: null,
          carbsG: null,
          fatG: null,
          fiberG: null,
          sugarG: null,
          saturatedFatG: null,
          sodiumMg: null,
        },
        ingredients: extracted.ingredients ?? [],
        steps: extracted.steps ?? [],
        tags: extracted.tags ?? [],
        photoUrl: extracted.photoUrl ?? null,
        targetLanguage,
      }),
    });
    const data = await res.json();
    setTranslating(false);
    if (!res.ok) {
      setError(data.error ?? "Traduzione non riuscita");
      return;
    }
    setProvider(data.provider ?? null);
    setExtracted(data);
    setFormKey((k) => k + 1);
  }

  if (extracted || manual) {
    return (
      <div>
        <h1 className="px-4 pt-4 font-display text-lg font-semibold text-foreground">Rivedi e salva</h1>
        <p className="px-4 text-sm text-muted-foreground">
          Controlla i dati estratti prima di salvare: l&apos;AI può sbagliare.
        </p>
        {provider?.startsWith("openrouter") && (
          <div className="mx-4 mt-2 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>Estratto con un modello di fallback gratuito: rivedi i dati con particolare attenzione.</p>
          </div>
        )}
        {extracted && (
          <Card className="mx-4 mt-3 flex items-end gap-2 p-3">
            <Select
              label="Traduci in"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="flex-1"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </Select>
            <Button type="button" variant="secondary" disabled={translating} onClick={translate}>
              {translating ? <Spinner /> : "Traduci"}
            </Button>
          </Card>
        )}
        {error && (
          <p className="mx-4 mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        <RecipeForm key={formKey} initialData={extracted ?? undefined} />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="font-display text-lg font-semibold text-foreground">Importa ricetta</h1>

      {error && (
        <div className="space-y-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <p>{error}</p>
          <button type="button" onClick={() => setManual(true)} className="font-medium underline">
            Inserisci manualmente
          </button>
        </div>
      )}

      <Tabs tabs={IMPORT_TABS} value={activeTab} onChange={setActiveTab} aria-label="Metodo di importazione" />

      <div role="tabpanel" id="panel-link" aria-labelledby="tab-link" hidden={activeTab !== "link"}>
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Link2 className="h-4 w-4" aria-hidden="true" />
            <span>Incolla il link di una ricetta online</span>
          </div>
          <form onSubmit={importFromUrl} className="space-y-3">
            <Input
              type="url"
              required
              placeholder="https://..."
              aria-label="URL della ricetta"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button type="submit" disabled={loading} className="w-full">
              {loading && activeTab === "link" ? (
                <>
                  <Spinner /> {loadingLabel}
                </>
              ) : (
                "Importa"
              )}
            </Button>
          </form>
        </Card>
      </div>

      <div role="tabpanel" id="panel-file" aria-labelledby="tab-file" hidden={activeTab !== "file"}>
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <ImageIcon className="h-4 w-4" aria-hidden="true" />
            <span>Carica uno screenshot o un PDF della ricetta</span>
          </div>
          <label
            htmlFor="import-file"
            className={buttonClasses(
              "secondary",
              "md",
              `w-full cursor-pointer${loading ? " pointer-events-none opacity-50" : ""}`,
            )}
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            {fileName ? "Cambia file" : "Scegli un file"}
          </label>
          <input
            id="import-file"
            type="file"
            accept="image/*,application/pdf"
            disabled={loading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setFileName(file.name);
                importFromFile(file);
              }
            }}
            className="sr-only"
          />
          {fileName && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate">{fileName}</span>
            </p>
          )}
          {loading && activeTab === "file" && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> {loadingLabel}
            </p>
          )}
        </Card>
      </div>

      <div role="tabpanel" id="panel-reel" aria-labelledby="tab-reel" hidden={activeTab !== "reel"}>
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Video className="h-4 w-4" aria-hidden="true" />
            <span>Incolla il link di un Reel Instagram</span>
          </div>
          <form onSubmit={importFromReel} className="space-y-3">
            <Input
              type="url"
              required
              placeholder="https://www.instagram.com/reel/..."
              aria-label="URL del Reel"
              value={reelUrl}
              onChange={(e) => setReelUrl(e.target.value)}
            />
            <Textarea
              placeholder="Note aggiuntive (facoltativo): ingredienti o passaggi che sai già dai commenti/descrizione"
              aria-label="Note aggiuntive"
              value={reelNotes}
              onChange={(e) => setReelNotes(e.target.value)}
              rows={2}
            />
            <Button type="submit" disabled={loading} className="w-full">
              {loading && activeTab === "reel" ? (
                <>
                  <Spinner /> {loadingLabel}
                </>
              ) : (
                "Importa dal Reel"
              )}
            </Button>
          </form>
        </Card>
      </div>

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
