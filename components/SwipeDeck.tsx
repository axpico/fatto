"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ChefHat, Clock, SlidersHorizontal, Undo2, X } from "lucide-react";
import { type RecipeCardData } from "@/components/RecipeCard";
import { SwipeCard, type SwipeCardHandle } from "@/components/SwipeCard";
import { TagFilterPanel } from "@/components/TagFilterPanel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ChipInput } from "@/components/ui/ChipInput";
import { pillButtonClasses } from "@/components/ui/Badge";
import { Modal, type ModalHandle } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { loadJson, reportIfFailed } from "@/lib/clientFetch";
import { deferCommit } from "@/lib/deferCommit";
import { useSuggestions } from "@/lib/useSuggestions";

// ssr:false must be called from a client component — this file is one.
const CookedCelebration = dynamic(
  () => import("@/components/motion/CookedCelebration").then((m) => m.CookedCelebration),
  { ssr: false },
);

type Phase = "loading" | "swiping" | "exhausted" | "noMatches";
type Tag = { id: string; name: string };
type TagMode = "all" | "any";
export type DeckFilters = {
  tagIds: string[];
  tagMode: TagMode;
  ingredients: string[];
  prepMax: string;
  cookMax: string;
};

/** Same shape for the page URL and /api/swipe/deck, so the URL alone restores a deck. */
export function deckFiltersToParams(f: DeckFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (f.tagIds.length > 0) params.set("tags", f.tagIds.join(","));
  if (f.tagIds.length > 0 && f.tagMode === "any") params.set("tagMode", "any");
  if (f.ingredients.length > 0) params.set("ingredients", f.ingredients.join(","));
  if (f.prepMax) params.set("prepMax", f.prepMax);
  if (f.cookMax) params.set("cookMax", f.cookMax);
  return params;
}

function activeFilterCount(f: DeckFilters): number {
  return f.tagIds.length + f.ingredients.length + (f.prepMax ? 1 : 0) + (f.cookMax ? 1 : 0);
}

const REJECT_UNDO_MS = 5000;

type DeckState = {
  current: RecipeCardData | null;
  next: RecipeCardData | null;
  afterNext: RecipeCardData | null;
  pool: RecipeCardData[];
};
type TimeBucket = "quick" | "medium" | "long";
const TIME_OPTIONS = [15, 30, 45, 60];

function timeBucket(recipe: RecipeCardData): TimeBucket {
  const total = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);
  if (total <= 20) return "quick";
  if (total <= 45) return "medium";
  return "long";
}

// ponytail: pesi solo in-sessione (azzerati a ogni nuovo giro), niente modello di preferenze
// persistito — se un giorno serve "impara nel tempo", questa è la mappa da spostare su DB
function score(recipe: RecipeCardData, tagWeight: Map<string, number>, timeWeight: Map<TimeBucket, number>) {
  const tagScores = recipe.tags.length > 0 ? recipe.tags.map((t) => tagWeight.get(t.id) ?? 1) : [1];
  const avgTag = tagScores.reduce((a, b) => a + b, 0) / tagScores.length;
  return avgTag * (timeWeight.get(timeBucket(recipe)) ?? 1);
}

function pickNext(pool: RecipeCardData[], tagWeight: Map<string, number>, timeWeight: Map<TimeBucket, number>) {
  if (pool.length === 0) return null;
  const scored = pool.map((r) => ({ r, s: score(r, tagWeight, timeWeight) }));
  const total = scored.reduce((sum, x) => sum + x.s, 0);
  let roll = Math.random() * total;
  for (const { r, s } of scored) {
    roll -= s;
    if (roll <= 0) return r;
  }
  return scored[scored.length - 1].r;
}

function decay(recipe: RecipeCardData, tagWeight: Map<string, number>, timeWeight: Map<TimeBucket, number>) {
  for (const tag of recipe.tags) {
    tagWeight.set(tag.id, Math.max(0.05, (tagWeight.get(tag.id) ?? 1) * 0.5));
  }
  const bucket = timeBucket(recipe);
  timeWeight.set(bucket, Math.max(0.05, (timeWeight.get(bucket) ?? 1) * 0.5));
}

export function SwipeDeck({ initialFilters }: { initialFilters: DeckFilters }) {
  const router = useRouter();
  const toast = useToast();

  const [phase, setPhase] = useState<Phase>("loading");
  const [tags, setTags] = useState<Tag[]>([]);
  // applied = what the deck was dealt with; draft = what the filter sheet is editing
  const [applied, setApplied] = useState<DeckFilters>(initialFilters);
  const [draft, setDraft] = useState<DeckFilters>(initialFilters);
  const ingredientSuggestions = useSuggestions<{ name: string }>("/api/ingredients", (r) => r.name);

  const [deck, setDeck] = useState<DeckState>({ current: null, next: null, afterNext: null, pool: [] });
  const { current, next, afterNext } = deck;
  const [fx, setFx] = useState<{ variant: "commit" | "reject"; key: string } | null>(null);
  const [lastReject, setLastReject] = useState<{ deck: DeckState; weights: [Map<string, number>, Map<TimeBucket, number>]; cancel: () => void } | null>(null);
  const tagWeight = useRef(new Map<string, number>());
  const timeWeight = useRef(new Map<TimeBucket, number>());
  const activeCardRef = useRef<SwipeCardHandle>(null);
  const filtersModalRef = useRef<ModalHandle>(null);
  const detailsModalRef = useRef<ModalHandle>(null);

  useEffect(() => {
    loadJson<Tag[]>("/api/tags", toast, setTags);
    deal(initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deal once per mount with the URL's filters, toast identity is stable
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (phase !== "swiping" || (e.target as HTMLElement | null)?.closest("input, textarea, dialog")) return;
      if (e.key === "ArrowLeft") activeCardRef.current?.commit("left");
      else if (e.key === "ArrowRight") activeCardRef.current?.commit("right");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase]);

  function beginSession(recipes: RecipeCardData[]) {
    tagWeight.current = new Map();
    timeWeight.current = new Map();
    setLastReject(null);
    if (recipes.length === 0) {
      setDeck({ current: null, next: null, afterNext: null, pool: [] });
      setPhase("noMatches");
      return;
    }
    const remaining = [...recipes];
    const first = pickNext(remaining, tagWeight.current, timeWeight.current)!;
    remaining.splice(remaining.indexOf(first), 1);
    const second = pickNext(remaining, tagWeight.current, timeWeight.current);
    if (second) remaining.splice(remaining.indexOf(second), 1);
    const third = pickNext(remaining, tagWeight.current, timeWeight.current);
    if (third) remaining.splice(remaining.indexOf(third), 1);
    setDeck({ current: first, next: second, afterNext: third, pool: remaining });
    setPhase("swiping");
  }

  async function deal(filters: DeckFilters) {
    setPhase("loading");
    let loaded = false;
    await loadJson<RecipeCardData[]>(`/api/swipe/deck?${deckFiltersToParams(filters)}`, toast, (recipes) => {
      loaded = true;
      beginSession(recipes);
    });
    if (!loaded) setPhase("noMatches"); // loadJson already toasted the error
  }

  function applyFilters() {
    filtersModalRef.current?.close();
    setApplied(draft);
    const query = deckFiltersToParams(draft).toString();
    router.replace(query ? `/decidi?${query}` : "/decidi", { scroll: false });
    deal(draft);
  }

  function openFilters() {
    setDraft(applied);
    filtersModalRef.current?.open();
  }

  function toggleTag(id: string) {
    setDraft((d) => ({ ...d, tagIds: d.tagIds.includes(id) ? d.tagIds.filter((t) => t !== id) : [...d.tagIds, id] }));
  }

  function handleExited(dir: "left" | "right") {
    if (!current) return;
    setFx({ variant: dir === "right" ? "commit" : "reject", key: current.id });
    if (dir === "right") return; // nav happens from handleFxDone once the burst plays out

    const rejectedId = current.id;
    // the reject (24h pause server-side) is only sent once the undo window closes
    const cancel = deferCommit(() => {
      fetch("/api/swipe/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId: rejectedId }),
        keepalive: true,
      }).catch(() => toast.error("Scarto non salvato, riprova più tardi."));
    }, REJECT_UNDO_MS);
    setLastReject({ deck, weights: [new Map(tagWeight.current), new Map(timeWeight.current)], cancel });

    decay(current, tagWeight.current, timeWeight.current);

    let remaining = deck.pool;
    let newAfterNext: RecipeCardData | null = null;
    if (afterNext && remaining.length > 0) {
      newAfterNext = pickNext(remaining, tagWeight.current, timeWeight.current);
      if (newAfterNext) remaining = remaining.filter((r) => r.id !== newAfterNext!.id);
    }
    setDeck({ current: next, next: afterNext, afterNext: newAfterNext, pool: remaining });
    if (!next) setPhase("exhausted");
  }

  function undoReject() {
    if (!lastReject) return;
    lastReject.cancel();
    [tagWeight.current, timeWeight.current] = lastReject.weights;
    setDeck(lastReject.deck);
    setLastReject(null);
    setPhase("swiping");
  }

  function handleFxDone() {
    if (fx?.variant === "commit") router.push(`/recipes/${fx.key}`);
    setFx(null);
  }

  async function unlockRejected() {
    const res = await fetch("/api/swipe/reject", { method: "DELETE" }).catch(() => null);
    if (!res) {
      toast.error("Connessione assente, riprova.");
      return;
    }
    if (await reportIfFailed(res, toast)) return;
    deal(applied);
  }

  const filterCount = activeFilterCount(applied);

  const filtersSheet = (
    <Modal ref={filtersModalRef} variant="sheet" title="Filtri">
      <div className="space-y-5">
        <TagFilterPanel
          tags={tags}
          selectedTagIds={draft.tagIds}
          tagMode={draft.tagMode}
          onToggleTag={toggleTag}
          onModeChange={(tagMode) => setDraft((d) => ({ ...d, tagMode }))}
        />

        <div className="border-t border-border pt-4">
          <p className="text-sm font-medium text-foreground">Cosa posso cucinare?</p>
          <p className="mb-3 text-sm text-muted-foreground">Aggiungi gli ingredienti che hai già a disposizione.</p>
          <ChipInput
            value={draft.ingredients}
            onChange={(ingredients) => setDraft((d) => ({ ...d, ingredients }))}
            placeholder="Es. pomodoro, poi invio"
            normalize={(raw) => raw.trim().toLowerCase()}
            suggestions={ingredientSuggestions}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
          {([
            ["prepMax", "Prep. entro (min)"],
            ["cookMax", "Cottura entro (min)"],
          ] as const).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {label}
              </p>
              <div className="flex flex-wrap gap-2">
                {TIME_OPTIONS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={draft[key] === String(v)}
                    onClick={() => setDraft((d) => ({ ...d, [key]: d[key] === String(v) ? "" : String(v) }))}
                    className={pillButtonClasses(draft[key] === String(v))}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="o minuti esatti"
                aria-label={label}
                value={draft[key]}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <Button type="button" onClick={applyFilters} className="w-full">
          Applica
        </Button>
      </div>
    </Modal>
  );

  const toolbar = (
    <div className="flex items-center justify-between gap-2">
      <h1 className="font-display text-xl font-semibold text-foreground">Decidi cosa cucinare</h1>
      <Button type="button" variant="secondary" size="sm" onClick={openFilters}>
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        Filtri{filterCount > 0 ? ` (${filterCount})` : ""}
      </Button>
    </div>
  );

  if (phase === "loading") {
    return (
      <div className="page-shell max-w-md space-y-6">
        {toolbar}
        <div className="flex aspect-[3/4] w-full items-center justify-center">
          <Spinner />
        </div>
        {filtersSheet}
      </div>
    );
  }

  if (phase === "noMatches" || phase === "exhausted") {
    return (
      <div className="page-shell max-w-md space-y-6">
        {toolbar}
        <EmptyState
          title={phase === "noMatches" ? (filterCount > 0 ? "Nessuna ricetta con questi filtri" : "Nessuna ricetta da proporre") : "Finite per oggi"}
          description={
            phase === "noMatches"
              ? "Allarga i filtri, oppure sblocca le ricette scartate nelle ultime 24 ore."
              : "Hai scartato tutto quello che c'era: le ricette scartate tornano dopo 24 ore."
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {lastReject && (
                <Button type="button" size="sm" onClick={undoReject}>
                  <Undo2 className="h-4 w-4" aria-hidden="true" /> Annulla ultimo scarto
                </Button>
              )}
              <Button type="button" variant="secondary" size="sm" onClick={unlockRejected}>
                Sblocca ricette scartate
              </Button>
              {filterCount > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={openFilters}>
                  Modifica filtri
                </Button>
              )}
            </div>
          }
        />
        {filtersSheet}
      </div>
    );
  }

  return (
    <div className="page-shell max-w-md space-y-6">
      {toolbar}
      <div className="relative mx-auto aspect-[3/4] w-full max-w-sm">
        {afterNext && <SwipeCard key={afterNext.id} recipe={afterNext} active={false} stackIndex={2} onExited={() => {}} />}
        {next && <SwipeCard key={next.id} recipe={next} active={false} stackIndex={1} onExited={() => {}} />}
        {current && (
          <SwipeCard
            key={current.id}
            ref={activeCardRef}
            recipe={current}
            active
            stackIndex={0}
            onExited={handleExited}
            onTap={() => detailsModalRef.current?.open()}
          />
        )}
        {fx && (
          <CookedCelebration
            key={fx.key}
            onDone={handleFxDone}
            durationMs={450}
            {...(fx.variant === "reject" ? { colorVar: "--muted-foreground", count: 30, opacity: 0.35 } : {})}
          />
        )}
      </div>
      <div className="flex items-center justify-center gap-4">
        <Button type="button" variant="destructive" size="lg" onClick={() => activeCardRef.current?.commit("left")} aria-label="Scarta">
          <X className="h-5 w-5" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={undoReject}
          disabled={!lastReject}
          aria-label="Annulla ultimo scarto"
        >
          <Undo2 className="h-5 w-5" aria-hidden="true" />
        </Button>
        <Button type="button" variant="primary" size="lg" onClick={() => activeCardRef.current?.commit("right")} aria-label="Cucina questa">
          <ChefHat className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">Tocca la carta per i dettagli</p>
      {current && (
        <Modal ref={detailsModalRef} variant="sheet" title={current.title}>
          <div className="space-y-4">
            {current.description ? (
              <p className="text-sm leading-6 text-muted-foreground">{current.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Nessuna descrizione.</p>
            )}
            <Link href={`/recipes/${current.id}`} className="block text-center text-sm font-medium text-primary underline">
              Apri la ricetta completa
            </Link>
          </div>
        </Modal>
      )}
      {filtersSheet}
    </div>
  );
}
