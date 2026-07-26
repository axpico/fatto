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
      <div className="page-shell max-w-3xl pb-0">
        <div className="rounded-xl border border-border bg-surface-secondary/70 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">Ultimo passaggio</p>
              <h1 className="page-title">Rivedi e salva</h1>
        <p className="page-description">
          Controlla i dati estratti prima di salvare: l&apos;AI può sbagliare.
              </p>
            </div>
          </div>
        </div>
        {provider?.startsWith("openrouter") && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>Estratto con un modello di fallback gratuito: rivedi i dati con particolare attenzione.</p>
          </div>
        )}
        {extracted && (
          <Card className="mt-4 border-primary/20 bg-accent/30 p-4">
            <div className="mb-3">
              <p className="font-medium text-foreground">Vuoi tradurla?</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Puoi tradurre tutto il contenuto prima di apportare le ultime modifiche.</p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
            <Select
              label="Traduci in"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="min-w-44 flex-1"
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
            </div>
          </Card>
        )}
        {error && (
          <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        <div className="mt-6">
          <RecipeForm key={formKey} initialData={extracted ?? undefined} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell max-w-3xl space-y-6">
      <div className="rounded-xl border border-border bg-surface-secondary/70 p-5 sm:p-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">Aggiungi una ricetta</p>
        <h1 className="page-title">Importa ricetta</h1>
        <p className="page-description">Estrai una ricetta da un link, un file o un Reel, quindi rivedila prima di salvarla.</p>
      </div>

      {error && (
        <div className="space-y-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <p>{error}</p>
          <button type="button" onClick={() => setManual(true)} className="font-medium underline">
            Inserisci manualmente
          </button>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-2 shadow-sm">
        <Tabs tabs={IMPORT_TABS} value={activeTab} onChange={setActiveTab} aria-label="Metodo di importazione" />
      </div>

      <div role="tabpanel" id="panel-link" aria-labelledby="tab-link" hidden={activeTab !== "link"}>
        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary"><Link2 className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">Da un link</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Incolla l&apos;URL di una ricetta online e noi estrarremo i dettagli.</p>
            </div>
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
        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary"><ImageIcon className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">Da un file</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Carica uno screenshot o un PDF: leggeremo il testo della ricetta per te.</p>
            </div>
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
        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary"><Video className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">Da un Reel</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Incolla un Reel Instagram e aggiungi tutto ciò che hai notato nel video.</p>
            </div>
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
