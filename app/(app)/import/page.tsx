"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link2, Image as ImageIcon, Video, Music2, Upload, CheckCircle2, TriangleAlert, FileText } from "lucide-react";
import { RecipeForm, type RecipeFormData } from "@/components/RecipeForm";
import type { ExtractedRecipe } from "@/lib/ai/schema";
import type { VideoPlatform } from "@/lib/videoImport";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { readErrorMessage } from "@/lib/clientFetch";

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
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "text", label: "Testo" },
];

const VIDEO_TABS: Record<VideoPlatform, { icon: typeof Video; title: string; description: string; placeholder: string }> = {
  instagram: {
    icon: Video,
    title: "Da un Reel",
    description: "Incolla un Reel Instagram e aggiungi tutto ciò che hai notato nel video.",
    placeholder: "https://www.instagram.com/reel/...",
  },
  youtube: {
    icon: Video,
    title: "Da un video YouTube",
    description: "Incolla un link YouTube, video lungo o Short, e aggiungi eventuali note.",
    placeholder: "https://www.youtube.com/watch?v=...",
  },
  tiktok: {
    icon: Music2,
    title: "Da un video TikTok",
    description: "Incolla un link TikTok e aggiungi tutto ciò che hai notato nel video.",
    placeholder: "https://www.tiktok.com/@utente/video/...",
  },
};

const LINK_STAGES = ["Scaricando pagina...", "Estraendo ricetta..."];
const FILE_STAGES = ["Leggendo il file...", "Estraendo ricetta..."];
const VIDEO_STAGES = [
  "Scaricando video...",
  "Trascrivendo audio...",
  "Estraendo fotogrammi...",
  "Estraendo ricetta...",
];
const TEXT_STAGES = ["Estraendo ricetta..."];

type ImportedRecipe = Omit<ExtractedRecipe, "steps"> & {
  photoUrl?: string | null;
  galleryFilenames?: string[];
  warnings?: string[];
  steps: (ExtractedRecipe["steps"][number] & { image_filename?: string | null })[];
};

type ImportStreamLine = { stage: string } | ({ done: true; error: string }) | (ImportedRecipe & { done: true; provider?: string });

/** Legge una risposta NDJSON in streaming (una riga { stage } per avanzamento, poi { done: true, ... }
 * o { done: true, error }), invocando onStage per ogni stage e restituendo il payload finale. */
async function runImportStream(
  url: string,
  init: RequestInit,
  onStage: (stage: string) => void,
  signal?: AbortSignal,
): Promise<ImportedRecipe & { provider?: string }> {
  const res = await fetch(url, { ...init, signal });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    throw new Error((body as { error?: string } | null)?.error ?? "Importazione fallita");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalLine: ImportStreamLine | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const parsed: ImportStreamLine = JSON.parse(line);
      if ("stage" in parsed) onStage(parsed.stage);
      else finalLine = parsed;
    }
  }

  if (!finalLine || "error" in finalLine) {
    throw new Error((finalLine as { error?: string } | null)?.error ?? "Importazione fallita");
  }
  return finalLine;
}

function mapExtractedToFormData(
  extracted: ImportedRecipe,
  source?: { url: string; isVideo?: boolean },
): Partial<RecipeFormData> {
  const n = extracted.nutrition;
  return {
    title: extracted.title,
    description: extracted.description ?? "",
    tags: extracted.tags,
    equipment: extracted.equipment,
    sourceUrl: source?.url ?? "",
    videoUrl: source?.isVideo ? source.url : "",
    // copertina prima, poi il resto della galleria (nel video la copertina è anche un fotogramma)
    photos: [...new Set([extracted.photoUrl, ...(extracted.galleryFilenames ?? [])])]
      .filter((f): f is string => !!f)
      .map((filename) => ({ kind: "existing" as const, filename })),
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
    servingsBase: extracted.servings,
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
      imageFilename: s.image_filename ?? null,
      imageFile: null,
    })),
  };
}

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState("link");
  const [url, setUrl] = useState("");
  const [videoUrls, setVideoUrls] = useState<Record<VideoPlatform, string>>({ instagram: "", youtube: "", tiktok: "" });
  const [videoNotes, setVideoNotes] = useState<Record<VideoPlatform, string>>({ instagram: "", youtube: "", tiktok: "" });
  const [pastedText, setPastedText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<Partial<RecipeFormData> | null>(null);
  const [manual, setManual] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [targetLanguage, setTargetLanguage] = useState(LANGUAGES[0].code);
  const [translating, setTranslating] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  // latest RecipeForm state: translation works on what the user has edited, not the raw extraction
  const currentFormRef = useRef<RecipeFormData | null>(null);
  const handleFormChange = useCallback((form: RecipeFormData) => {
    currentFormRef.current = form;
  }, []);

  useEffect(() => {
    if (!loading) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [loading]);

  function backToImport() {
    setExtracted(null);
    setManual(false);
    setError(null);
    setWarnings([]);
    currentFormRef.current = null;
  }

  async function importFromUrl(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStageIndex(-1);
    setError(null);
    setWarnings([]);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const data = await runImportStream(
        "/api/import/link",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        },
        (stage) => setStageIndex(LINK_STAGES.indexOf(stage)),
        controller.signal,
      );
      setProvider(data.provider ?? null);
      setExtracted(mapExtractedToFormData(data, { url }));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStageIndex(-1);
      } else {
        setError(err instanceof Error ? err.message : "Importazione fallita");
      }
    } finally {
      setLoading(false);
    }
  }

  async function importFromFile(file: File) {
    setLoading(true);
    setStageIndex(-1);
    setError(null);
    setWarnings([]);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const body = new FormData();
      body.set("file", file);
      const data = await runImportStream(
        "/api/import/file",
        { method: "POST", body },
        (stage) => setStageIndex(FILE_STAGES.indexOf(stage)),
        controller.signal,
      );
      setProvider(data.provider ?? null);
      setExtracted(mapExtractedToFormData(data));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStageIndex(-1);
      } else {
        setError(err instanceof Error ? err.message : "Importazione fallita");
      }
    } finally {
      setLoading(false);
    }
  }

  async function importVideo(platform: VideoPlatform, e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStageIndex(-1);
    setError(null);
    setWarnings([]);
    const videoUrl = videoUrls[platform];
    const notes = videoNotes[platform];
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const data = await runImportStream(
        "/api/import/video",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: videoUrl, notes: notes || undefined, platform }),
        },
        (stage) => setStageIndex(VIDEO_STAGES.indexOf(stage)),
        controller.signal,
      );
      setProvider(data.provider ?? null);
      setWarnings(data.warnings ?? []);
      setExtracted(mapExtractedToFormData(data, { url: videoUrl, isVideo: true }));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStageIndex(-1);
      } else {
        setError(err instanceof Error ? err.message : "Importazione fallita");
      }
    } finally {
      setLoading(false);
    }
  }

  async function importFromText(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStageIndex(-1);
    setError(null);
    setWarnings([]);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const data = await runImportStream(
        "/api/import/text",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: pastedText }),
        },
        (stage) => setStageIndex(TEXT_STAGES.indexOf(stage)),
        controller.signal,
      );
      setProvider(data.provider ?? null);
      setExtracted(mapExtractedToFormData(data));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStageIndex(-1);
      } else {
        setError(err instanceof Error ? err.message : "Importazione fallita");
      }
    } finally {
      setLoading(false);
    }
  }

  async function translate() {
    const current = currentFormRef.current ?? extracted;
    if (!current) return;
    setTranslating(true);
    setError(null);
    const ingredients = current.ingredients ?? [];
    const steps = current.steps ?? [];
    try {
      const res = await fetch("/api/import/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: current.title ?? "",
          description: current.description || null,
          ingredientNames: ingredients.map((i) => i.name),
          stepInstructions: steps.map((s) => s.instruction),
          equipment: current.equipment ?? [],
          tags: current.tags ?? [],
          targetLanguage,
        }),
      });
      if (!res.ok) {
        setError(await readErrorMessage(res, "Traduzione non riuscita"));
        return;
      }
      const data = await res.json();
      setProvider(data.provider ?? null);
      // remount the form on the translated copy of the *edited* state; the form stays
      // "unsaved" via unsavedFromStart, so the leave-guard still holds after the remount
      setExtracted({
        ...current,
        title: data.title,
        description: data.description ?? "",
        ingredients: ingredients.map((ing, i) => ({ ...ing, name: data.ingredientNames[i] })),
        steps: steps.map((step, i) => ({ ...step, instruction: data.stepInstructions[i] })),
        equipment: data.equipment,
        tags: data.tags,
      });
      setFormKey((k) => k + 1);
    } catch {
      setError("Connessione assente: traduzione non riuscita, riprova");
    } finally {
      setTranslating(false);
    }
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
        {(provider?.startsWith("openrouter") || provider === "groq") && (
          <ErrorBanner variant="warning" className="mt-4 flex items-start gap-2">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>Estratto con un modello di fallback gratuito: rivedi i dati con particolare attenzione.</p>
          </ErrorBanner>
        )}
        {warnings.map((w) => (
          <ErrorBanner key={w} variant="warning" className="mt-4 flex items-start gap-2">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{w}</p>
          </ErrorBanner>
        ))}
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
        {error && <ErrorBanner className="mt-3">{error}</ErrorBanner>}
        <div className="mt-6">
          <RecipeForm
            key={formKey}
            initialData={extracted ?? undefined}
            unsavedFromStart={!!extracted}
            onFormChange={handleFormChange}
            backLabel="Torna all'import"
            onBack={backToImport}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell max-w-3xl space-y-6">
      <div className="rounded-xl border border-border bg-surface-secondary/70 p-5 sm:p-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">Aggiungi una ricetta</p>
        <h1 className="page-title">Importa ricetta</h1>
        <p className="page-description">Estrai una ricetta da un link, un file o un video (Instagram, YouTube, TikTok), quindi rivedila prima di salvarla.</p>
      </div>

      {error && (
        <ErrorBanner className="space-y-2">
          <p>{error}</p>
          <button type="button" onClick={() => setManual(true)} className="font-medium underline">
            Inserisci manualmente
          </button>
        </ErrorBanner>
      )}

      <div className="rounded-xl border border-border bg-surface p-2 shadow-sm">
        <Tabs
          tabs={IMPORT_TABS.map((tab) => ({ ...tab, disabled: loading && tab.value !== activeTab }))}
          value={activeTab}
          onChange={setActiveTab}
          aria-label="Metodo di importazione"
        />
      </div>

      <div role="tabpanel" id="panel-link" aria-labelledby="tab-link" hidden={activeTab !== "link"}>
        <Card className="p-5 sm:p-6">
          <SectionIntro
            icon={Link2}
            size="lg"
            title="Da un link"
            description="Incolla l'URL di una ricetta online e noi estrarremo i dettagli."
          />
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
              {loading && activeTab === "link" ? <Spinner /> : "Importa"}
            </Button>
            {loading && activeTab === "link" && (
              <>
                <ProgressBar
                  value={((stageIndex + 1) / LINK_STAGES.length) * 100}
                  label={LINK_STAGES[stageIndex] ?? "Avvio..."}
                />
                <Button type="button" variant="secondary" className="w-full" onClick={() => abortControllerRef.current?.abort()}>
                  Annulla
                </Button>
              </>
            )}
          </form>
        </Card>
      </div>

      <div role="tabpanel" id="panel-file" aria-labelledby="tab-file" hidden={activeTab !== "file"}>
        <Card className="p-5 sm:p-6">
          <SectionIntro
            icon={ImageIcon}
            size="lg"
            title="Da un file"
            description="Carica uno screenshot o un PDF: leggeremo il testo della ricetta per te."
          />
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
            <div className="mt-3 space-y-3">
              <ProgressBar
                value={((stageIndex + 1) / FILE_STAGES.length) * 100}
                label={FILE_STAGES[stageIndex] ?? "Avvio..."}
              />
              <Button type="button" variant="secondary" className="w-full" onClick={() => abortControllerRef.current?.abort()}>
                Annulla
              </Button>
            </div>
          )}
        </Card>
      </div>

      {(Object.keys(VIDEO_TABS) as VideoPlatform[]).map((platform) => {
        const tab = VIDEO_TABS[platform];
        return (
          <div key={platform} role="tabpanel" id={`panel-${platform}`} aria-labelledby={`tab-${platform}`} hidden={activeTab !== platform}>
            <Card className="p-5 sm:p-6">
              <SectionIntro icon={tab.icon} size="lg" title={tab.title} description={tab.description} />
              <form onSubmit={(e) => importVideo(platform, e)} className="space-y-3">
                <Input
                  type="url"
                  required
                  placeholder={tab.placeholder}
                  aria-label="URL del video"
                  value={videoUrls[platform]}
                  onChange={(e) => setVideoUrls((prev) => ({ ...prev, [platform]: e.target.value }))}
                />
                <Textarea
                  placeholder="Note aggiuntive (facoltativo): ingredienti o passaggi che sai già dai commenti/descrizione"
                  aria-label="Note aggiuntive"
                  value={videoNotes[platform]}
                  onChange={(e) => setVideoNotes((prev) => ({ ...prev, [platform]: e.target.value }))}
                  rows={2}
                />
                <Button type="submit" disabled={loading} className="w-full">
                  {loading && activeTab === platform ? <Spinner /> : "Importa dal video"}
                </Button>
                {loading && activeTab === platform && (
                  <>
                    <ProgressBar
                      value={((stageIndex + 1) / VIDEO_STAGES.length) * 100}
                      label={VIDEO_STAGES[stageIndex] ?? "Avvio..."}
                    />
                    <Button type="button" variant="secondary" className="w-full" onClick={() => abortControllerRef.current?.abort()}>
                      Annulla
                    </Button>
                  </>
                )}
              </form>
            </Card>
          </div>
        );
      })}

      <div role="tabpanel" id="panel-text" aria-labelledby="tab-text" hidden={activeTab !== "text"}>
        <Card className="p-5 sm:p-6">
          <SectionIntro
            icon={FileText}
            size="lg"
            title="Da un testo incollato"
            description="Incolla il testo di una ricetta (da un sito, una chat, un file markdown) e la estrarremo per te."
          />
          <form onSubmit={importFromText} className="space-y-3">
            <Textarea
              required
              placeholder="Incolla qui il testo della ricetta..."
              aria-label="Testo della ricetta"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows={10}
            />
            <Button type="submit" disabled={loading} className="w-full">
              {loading && activeTab === "text" ? <Spinner /> : "Importa"}
            </Button>
            {loading && activeTab === "text" && (
              <>
                <ProgressBar
                  value={((stageIndex + 1) / TEXT_STAGES.length) * 100}
                  label={TEXT_STAGES[stageIndex] ?? "Avvio..."}
                />
                <Button type="button" variant="secondary" className="w-full" onClick={() => abortControllerRef.current?.abort()}>
                  Annulla
                </Button>
              </>
            )}
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
