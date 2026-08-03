"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChefHat, Clock, Shuffle, Tag as TagIcon, X } from "lucide-react";
import { type RecipeCardData } from "@/components/RecipeCard";
import { SwipeCard, type SwipeCardHandle } from "@/components/SwipeCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { pillButtonClasses } from "@/components/ui/Badge";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { loadJson } from "@/lib/apiError";

type Phase = "setup" | "swiping" | "empty";
type Tag = { id: string; name: string };
type TagMode = "all" | "any";
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

export function SwipeDeck() {
  const router = useRouter();
  const toast = useToast();

  const [phase, setPhase] = useState<Phase>("setup");
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagMode, setTagMode] = useState<TagMode>("all");
  const [prepMax, setPrepMax] = useState("");
  const [cookMax, setCookMax] = useState("");

  const [pool, setPool] = useState<RecipeCardData[]>([]);
  const [current, setCurrent] = useState<RecipeCardData | null>(null);
  const [next, setNext] = useState<RecipeCardData | null>(null);
  const tagWeight = useRef(new Map<string, number>());
  const timeWeight = useRef(new Map<TimeBucket, number>());
  const activeCardRef = useRef<SwipeCardHandle>(null);

  useEffect(() => {
    loadJson<Tag[]>("/api/tags", toast, setTags);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once per mount, toast identity is stable
  }, []);

  function beginSession(recipes: RecipeCardData[]) {
    tagWeight.current = new Map();
    timeWeight.current = new Map();
    if (recipes.length === 0) {
      setCurrent(null);
      setNext(null);
      setPool([]);
      setPhase("empty");
      return;
    }
    const remaining = [...recipes];
    const first = pickNext(remaining, tagWeight.current, timeWeight.current)!;
    remaining.splice(remaining.indexOf(first), 1);
    const second = pickNext(remaining, tagWeight.current, timeWeight.current);
    if (second) remaining.splice(remaining.indexOf(second), 1);
    setCurrent(first);
    setNext(second);
    setPool(remaining);
    setPhase("swiping");
  }

  async function startSwiping() {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedTagIds.length > 0) params.set("tags", selectedTagIds.join(","));
    if (selectedTagIds.length > 0 && tagMode === "any") params.set("tagMode", "any");
    if (prepMax) params.set("prepMax", prepMax);
    if (cookMax) params.set("cookMax", cookMax);
    await loadJson<RecipeCardData[]>(`/api/swipe/deck?${params}`, toast, beginSession);
    setLoading(false);
  }

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  function handleExited(dir: "left" | "right") {
    if (!current) return;
    if (dir === "right") {
      router.push(`/recipes/${current.id}`);
      return;
    }

    fetch("/api/swipe/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeId: current.id }),
    }).catch(() => toast.error("Scarto non salvato, riprova più tardi."));

    decay(current, tagWeight.current, timeWeight.current);

    const newCurrent = next;
    let remaining = pool;
    let newNext: RecipeCardData | null = null;
    if (newCurrent && remaining.length > 0) {
      newNext = pickNext(remaining, tagWeight.current, timeWeight.current);
      if (newNext) remaining = remaining.filter((r) => r.id !== newNext!.id);
    }
    setPool(remaining);
    setCurrent(newCurrent);
    setNext(newNext);
    if (!newCurrent) setPhase("empty");
  }

  async function unlockRejected() {
    await fetch("/api/swipe/reject", { method: "DELETE" });
    startSwiping();
  }

  if (phase === "setup") {
    return (
      <div className="page-shell max-w-md space-y-6">
        <Card className="space-y-5 p-4 sm:p-5">
          <SectionIntro icon={Shuffle} title="Decidi cosa cucinare" description="Scarta quello che non ti va, tieni quello che ti convince. Filtri opzionali, oppure parti subito." />

          {tags.length > 0 && (
            <div className="border-t border-border pt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <TagIcon className="h-3.5 w-3.5" aria-hidden="true" /> Tag
                </p>
                <div className="flex gap-1.5" role="radiogroup" aria-label="Modalità filtro tag">
                  <button type="button" role="radio" aria-checked={tagMode === "all"} onClick={() => setTagMode("all")} className={pillButtonClasses(tagMode === "all")}>
                    Tutti
                  </button>
                  <button type="button" role="radio" aria-checked={tagMode === "any"} onClick={() => setTagMode("any")} className={pillButtonClasses(tagMode === "any")}>
                    Almeno uno
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button key={tag.id} type="button" aria-pressed={selectedTagIds.includes(tag.id)} onClick={() => toggleTag(tag.id)} className={pillButtonClasses(selectedTagIds.includes(tag.id))}>
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Prep. entro (min)
              </label>
              <div className="flex flex-wrap gap-2">
                {TIME_OPTIONS.map((v) => (
                  <button key={v} type="button" aria-pressed={prepMax === String(v)} onClick={() => setPrepMax(prepMax === String(v) ? "" : String(v))} className={pillButtonClasses(prepMax === String(v))}>
                    {v}
                  </button>
                ))}
              </div>
              <Input type="number" min={0} placeholder="o minuti esatti" value={prepMax} onChange={(e) => setPrepMax(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Cottura entro (min)
              </label>
              <div className="flex flex-wrap gap-2">
                {TIME_OPTIONS.map((v) => (
                  <button key={v} type="button" aria-pressed={cookMax === String(v)} onClick={() => setCookMax(cookMax === String(v) ? "" : String(v))} className={pillButtonClasses(cookMax === String(v))}>
                    {v}
                  </button>
                ))}
              </div>
              <Input type="number" min={0} placeholder="o minuti esatti" value={cookMax} onChange={(e) => setCookMax(e.target.value)} />
            </div>
          </div>

          <Button type="button" onClick={startSwiping} disabled={loading} className="w-full">
            {loading ? <Spinner className="h-4 w-4" /> : "Inizia"}
          </Button>
        </Card>
      </div>
    );
  }

  if (phase === "empty") {
    return (
      <div className="page-shell max-w-md">
        <EmptyState
          title="Finite per oggi"
          description="Hai scartato tutto quello che c'era, o è tutto in pausa da uno scarto recente."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={unlockRejected}>
                Sblocca ricette scartate
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPhase("setup")}>
                Modifica filtri
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="page-shell max-w-md space-y-6">
      <div className="relative mx-auto aspect-[3/4] w-full max-w-sm">
        {next && <SwipeCard key={next.id} recipe={next} active={false} onExited={() => {}} />}
        {current && <SwipeCard key={current.id} ref={activeCardRef} recipe={current} active onExited={handleExited} />}
      </div>
      <div className="flex justify-center gap-4">
        <Button type="button" variant="destructive" size="lg" onClick={() => activeCardRef.current?.commit("left")} aria-label="Scarta">
          <X className="h-5 w-5" aria-hidden="true" />
        </Button>
        <Button type="button" variant="primary" size="lg" onClick={() => activeCardRef.current?.commit("right")} aria-label="Cucina questa">
          <ChefHat className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
