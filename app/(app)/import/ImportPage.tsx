"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Video, Upload, CheckCircle2, TriangleAlert, ClipboardPaste } from "lucide-react";
import { RecipeForm, type RecipeFormData } from "@/components/RecipeForm";
import type { ExtractedRecipe } from "@/lib/ai/schema";
import { detectVideoPlatform, extractFirstUrl, type VideoPlatform } from "@/lib/videoPlatforms";
import { MAX_UPLOAD_BYTES } from "@/lib/uploadLimits";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { readErrorMessage } from "@/lib/clientFetch";

const LANGUAGES = [
  { code: "italiano", label: "Italiano" },
  { code: "inglese", label: "Inglese" },
  { code: "spagnolo", label: "Spagnolo" },
  { code: "francese", label: "Francese" },
  { code: "tedesco", label: "Tedesco" },
];

const IMPORT_TABS = [
  { value: "link", label: "Link o video" },
  { value: "file", label: "Screenshot/PDF" },
  { value: "text", label: "Testo" },
];

const VIDEO_PLATFORM_LABEL: Record<VideoPlatform, string> = {
  instagram: "Reel Instagram",
  youtube: "Video YouTube",
  tiktok: "Video TikTok",
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

/** Midpoint of the current stage: the last stage (the slow AI call) never shows a full bar. */
function stageProgress(stageIndex: number, stageCount: number): number {
  return stageIndex < 0 ? 0 : ((stageIndex + 0.5) / stageCount) * 100;
}

type Duplicate = { id: string; title: string };

async function findDuplicate(url: string): Promise<Duplicate | null> {
  try {
    const res = await fetch(`/api/recipes?sourceUrl=${encodeURIComponent(url.trim())}`);
    if (!res.ok) return null;
    const rows: Duplicate[] = await res.json();
    return rows[0] ?? null;
  } catch {
    return null; // best-effort: a failed check must not block the import
  }
}

export function ImportPage({ sharedUrl, sharedText }: { sharedUrl: string; sharedText: string }) {
  const [activeTab, setActiveTab] = useState(!sharedUrl && sharedText ? "text" : "link");
  const [url, setUrl] = useState(sharedUrl);
  const [videoNotes, setVideoNotes] = useState("");
  const [pastedText, setPastedText] = useState(sharedUrl ? "" : sharedText);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(-1);
  const [stageCount, setStageCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<Duplicate | null>(null);
  const [extracted, setExtracted] = useState<Partial<RecipeFormData> | null>(null);
  const [manual, setManual] = useState<Partial<RecipeFormData> | null>(null);
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

  const videoPlatform = detectVideoPlatform(url);

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
    setManual(null);
    setError(null);
    setWarnings([]);
    currentFormRef.current = null;
  }

  function startManual() {
    // carry over what the user already gave us instead of an empty form
    const trimmedUrl = url.trim();
    if (activeTab === "link" && trimmedUrl) {
      setManual(videoPlatform ? { sourceUrl: trimmedUrl, videoUrl: trimmedUrl } : { sourceUrl: trimmedUrl });
    } else if (activeTab === "text" && pastedText.trim()) {
      setManual({ description: pastedText.trim() });
    } else {
      setManual({});
    }
  }

  async function runImport(
    endpoint: string,
    init: RequestInit,
    stages: string[],
    source?: { url: string; isVideo?: boolean },
  ) {
    setLoading(true);
    setStageIndex(-1);
    setStageCount(stages.length);
    setError(null);
    setDuplicate(null);
    setWarnings([]);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const data = await runImportStream(endpoint, init, (stage) => setStageIndex(stages.indexOf(stage)), controller.signal);
      setProvider(data.provider ?? null);
      setWarnings(data.warnings ?? []);
      setExtracted(mapExtractedToFormData(data, source));
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

  async function importLink(skipDuplicateCheck = false) {
    if (loading) return;
    const target = url.trim();
    if (!skipDuplicateCheck) {
      // loading already during the check: a double tap must not start two imports
      setLoading(true);
      const dup = await findDuplicate(target);
      if (dup) {
        setDuplicate(dup);
        setLoading(false);
        return;
      }
    }
    if (videoPlatform) {
      await runImport(
        "/api/import/video",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: target, notes: videoNotes || undefined, platform: videoPlatform }),
        },
        VIDEO_STAGES,
        { url: target, isVideo: true },
      );
    } else {
      await runImport(
        "/api/import/link",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: target }) },
        LINK_STAGES,
        { url: target },
      );
    }
  }

  function importFromFile(file: File) {
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`File troppo grande (max ${MAX_UPLOAD_BYTES / 1024 / 1024}MB)`);
      return;
    }
    const body = new FormData();
    body.set("file", file);
    runImport("/api/import/file", { method: "POST", body }, FILE_STAGES);
  }

  function importFromText(e: React.FormEvent) {
    e.preventDefault();
    runImport(
      "/api/import/text",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: pastedText }) },
      TEXT_STAGES,
    );
  }

  async function pasteUrl() {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(extractFirstUrl(text) ?? text.trim());
      setDuplicate(null);
    } catch {
      setError("Non riesco a leggere gli appunti: incolla il link a mano.");
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

  const progress = loading && (
    <>
      <ProgressBar value={stageProgress(stageIndex, stageCount)} label={stageLabel(stageIndex, stageCount, activeTab, videoPlatform)} />
      <Button type="button" variant="secondary" className="w-full" onClick={() => abortControllerRef.current?.abort()}>
        Annulla
      </Button>
    </>
  );

  if (extracted || manual) {
    return (
      <div className="page-shell pb-0">
        <div>
          <h1 className="page-title">{extracted ? "Rivedi e salva" : "Nuova ricetta"}</h1>
          {extracted && <p className="page-description">Controlla i dati estratti prima di salvare: l&apos;AI può sbagliare.</p>}
        </div>
        {(provider?.startsWith("openrouter") || provider === "groq") && extracted && (
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
          // compact inline row: translation keeps (and translates) the edits already made
          <div className="mt-4 flex items-center gap-2">
            <Select
              aria-label="Lingua di traduzione"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="w-auto min-w-36"
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
        )}
        {error && <ErrorBanner className="mt-3">{error}</ErrorBanner>}
        <div className="mt-6">
          <RecipeForm
            key={formKey}
            initialData={extracted ?? manual ?? undefined}
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
    <div className="page-shell space-y-6">
      <div>
        <h1 className="page-title">Importa</h1>
        <p className="page-description">Da un sito, un video Instagram/YouTube/TikTok, uno screenshot o un testo. La rivedi prima di salvarla.</p>
      </div>

      {error && (
        <ErrorBanner className="space-y-2">
          <p>{error}</p>
          <button type="button" onClick={startManual} className="font-medium underline">
            Inserisci manualmente
          </button>
        </ErrorBanner>
      )}

      <Tabs
        tabs={IMPORT_TABS.map((tab) => ({ ...tab, disabled: loading && tab.value !== activeTab }))}
        value={activeTab}
        onChange={setActiveTab}
        aria-label="Metodo di importazione"
      />

      <div role="tabpanel" id="panel-link" aria-labelledby="tab-link" hidden={activeTab !== "link"}>
        <Card className="p-4 sm:p-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              importLink();
            }}
            className="space-y-3"
          >
            <div className="flex gap-2">
              <Input
                type="url"
                required
                autoFocus={!sharedUrl}
                enterKeyHint="go"
                placeholder="https://..."
                aria-label="URL della ricetta o del video"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setDuplicate(null);
                }}
              />
              <Button type="button" variant="secondary" onClick={pasteUrl} aria-label="Incolla dagli appunti" className="shrink-0">
                <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Incolla</span>
              </Button>
            </div>
            {videoPlatform && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Video className="h-4 w-4 shrink-0" aria-hidden="true" />
                {VIDEO_PLATFORM_LABEL[videoPlatform]}: trascriviamo l&apos;audio, può richiedere qualche minuto.
              </p>
            )}
            {videoPlatform && (
              <Textarea
                placeholder="Note aggiuntive (facoltativo): ingredienti o passaggi che sai già dai commenti/descrizione"
                aria-label="Note aggiuntive"
                value={videoNotes}
                onChange={(e) => setVideoNotes(e.target.value)}
                rows={2}
              />
            )}
            {duplicate && (
              <ErrorBanner variant="warning" className="space-y-2">
                <p>
                  Hai già salvato questa ricetta: <strong>{duplicate.title}</strong>
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href={`/recipes/${duplicate.id}`} className="font-medium underline">
                    Apri ricetta
                  </Link>
                  <button type="button" onClick={() => importLink(true)} disabled={loading} className="font-medium underline disabled:opacity-50">
                    Importa comunque
                  </button>
                </div>
              </ErrorBanner>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading && activeTab === "link" ? <Spinner /> : videoPlatform ? "Importa dal video" : "Importa"}
            </Button>
            {activeTab === "link" && progress}
          </form>
        </Card>
      </div>

      <div role="tabpanel" id="panel-file" aria-labelledby="tab-file" hidden={activeTab !== "file"}>
        <Card className="p-4 sm:p-5">
          <p className="mb-3 text-sm text-muted-foreground">Screenshot o PDF, max 8MB.</p>
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
              e.target.value = "";
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
          {activeTab === "file" && loading && <div className="mt-3 space-y-3">{progress}</div>}
        </Card>
      </div>

      <div role="tabpanel" id="panel-text" aria-labelledby="tab-text" hidden={activeTab !== "text"}>
        <Card className="p-4 sm:p-5">
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
            {activeTab === "text" && progress}
          </form>
        </Card>
      </div>

      <button
        type="button"
        onClick={startManual}
        className="text-sm text-muted-foreground underline hover:text-foreground"
      >
        Oppure inserisci la ricetta manualmente
      </button>
    </div>
  );
}

function stageLabel(stageIndex: number, stageCount: number, tab: string, platform: VideoPlatform | null): string {
  const stages =
    tab === "file" ? FILE_STAGES : tab === "text" ? TEXT_STAGES : platform ? VIDEO_STAGES : LINK_STAGES;
  return stages.length === stageCount ? (stages[stageIndex] ?? "Avvio...") : "Avvio...";
}
