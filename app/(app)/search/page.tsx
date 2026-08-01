"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { type RecipeCardData } from "@/components/RecipeCard";
import { RecipeList } from "@/components/RecipeList";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge, pillButtonClasses } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

type Tag = { id: string; name: string };
type TagMode = "all" | "any";
type Sort = "relevance" | "best-match" | "recent" | "most-cooked" | "prep-time";

const RATING_OPTIONS = [3, 4, 5];

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><Spinner /></div>}>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    () => searchParams.get("tags")?.split(",").filter(Boolean) ?? [],
  );
  const [tagMode, setTagMode] = useState<TagMode>(() => (searchParams.get("tagMode") === "any" ? "any" : "all"));
  const [ingredientInput, setIngredientInput] = useState("");
  const [ingredients, setIngredients] = useState<string[]>(
    () => searchParams.get("ingredients")?.split(",").filter(Boolean) ?? [],
  );
  const [ingredientSuggestions, setIngredientSuggestions] = useState<string[]>([]);
  const [prepMax, setPrepMax] = useState(() => searchParams.get("prepMax") ?? "");
  const [cookMax, setCookMax] = useState(() => searchParams.get("cookMax") ?? "");
  const [servingsMin, setServingsMin] = useState(() => searchParams.get("servingsMin") ?? "");
  const [ratingMin, setRatingMin] = useState(() => searchParams.get("ratingMin") ?? "");
  const [explicitSort, setExplicitSort] = useState<Sort | null>(() => (searchParams.get("sort") as Sort) ?? null);
  const [results, setResults] = useState<RecipeCardData[]>([]);
  const [status, setStatus] = useState<"loading" | "done">("loading");

  // finché l'utente non sceglie un sort esplicito, lo deriviamo dal filtro più specifico attivo
  const sort: Sort = explicitSort ?? (ingredients.length > 0 ? "best-match" : query.trim() ? "relevance" : "recent");

  useEffect(() => {
    fetch("/api/tags")
      .then((res) => res.json())
      .then(setTags);
  }, []);

  useEffect(() => {
    fetch("/api/ingredients")
      .then((res) => res.json())
      .then((rows: { name: string }[]) => setIngredientSuggestions(rows.map((r) => r.name)));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (selectedTagIds.length > 0) params.set("tags", selectedTagIds.join(","));
    if (selectedTagIds.length > 0 && tagMode === "any") params.set("tagMode", "any");
    if (ingredients.length > 0) params.set("ingredients", ingredients.join(","));
    if (prepMax) params.set("prepMax", prepMax);
    if (cookMax) params.set("cookMax", cookMax);
    if (servingsMin) params.set("servingsMin", servingsMin);
    if (ratingMin) params.set("ratingMin", ratingMin);
    if (explicitSort) params.set("sort", explicitSort);

    const controller = new AbortController();
    const handle = setTimeout(() => {
      router.replace(params.size > 0 ? `/search?${params}` : "/search", { scroll: false });
      setStatus("loading");
      fetch(`/api/recipes?${params}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          setResults(data);
          setStatus("done");
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          toast.error("Ricerca non riuscita, riprova.");
          setStatus("done");
        });
    }, 200);

    return () => {
      clearTimeout(handle);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast identity is stable, omitted to avoid re-running the search on every render
  }, [query, selectedTagIds, tagMode, ingredients, prepMax, cookMax, servingsMin, ratingMin, explicitSort, sort, router]);

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  function addIngredient() {
    const term = ingredientInput.trim().toLowerCase();
    if (!term || ingredients.includes(term)) return;
    setIngredients((prev) => [...prev, term]);
    setIngredientInput("");
  }

  const hasActiveFilters =
    query.trim() !== "" ||
    selectedTagIds.length > 0 ||
    ingredients.length > 0 ||
    prepMax !== "" ||
    cookMax !== "" ||
    servingsMin !== "" ||
    ratingMin !== "";

  const activeFilterCount =
    selectedTagIds.length +
    ingredients.length +
    (prepMax ? 1 : 0) +
    (cookMax ? 1 : 0) +
    (servingsMin ? 1 : 0) +
    (ratingMin ? 1 : 0);

  // aperto di default se l'utente ha già dei filtri attivi al mount, altrimenti chiuso su mobile
  const [filtersOpen, setFiltersOpen] = useState(hasActiveFilters);

  function clearFilters() {
    setQuery("");
    setSelectedTagIds([]);
    setTagMode("all");
    setIngredients([]);
    setIngredientInput("");
    setPrepMax("");
    setCookMax("");
    setServingsMin("");
    setRatingMin("");
    setExplicitSort(null);
  }

  const sortOptions: { value: Sort; label: string }[] = [
    { value: "relevance", label: "Rilevanza" },
    { value: "best-match", label: "Miglior abbinamento" },
    { value: "recent", label: "Recenti" },
    { value: "most-cooked", label: "Più cucinate" },
    { value: "prep-time", label: "Tempo di preparazione" },
  ];

  return (
    <div className="page-shell max-w-3xl space-y-6">
      <div className="page-header rounded-xl border border-border bg-surface-secondary/70 p-5 sm:p-6">
        <div>
          <p className="eyebrow mb-2"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Scopri cosa cucinare</p>
          <h1 className="page-title">Cerca ricette</h1>
          <p className="page-description">Trova una ricetta o parti dagli ingredienti che hai già.</p>
        </div>
        {hasActiveFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            Cancella filtri
          </Button>
        )}
      </div>

      <Card className="space-y-5 p-4 sm:p-5">
        <SectionIntro icon={SlidersHorizontal} title="Trova la ricetta giusta" description="Cerca per nome o restringi i risultati con i filtri." />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Cerca per titolo o descrizione"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          aria-controls="search-filters-panel"
          className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground sm:hidden"
        >
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filtri
            {activeFilterCount > 0 && (
              <Badge variant="accent" size="sm">
                {activeFilterCount}
              </Badge>
            )}
          </span>
          {filtersOpen ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
        </button>

      <div id="search-filters-panel" className={`space-y-5 ${filtersOpen ? "" : "hidden sm:block"}`}>
      {tags.length > 0 && (
        <div className="border-t border-border pt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Filtra per tag</p>
            <div className="flex gap-1.5" role="radiogroup" aria-label="Modalità filtro tag">
              <button
                type="button"
                role="radio"
                aria-checked={tagMode === "all"}
                onClick={() => setTagMode("all")}
                className={pillButtonClasses(tagMode === "all")}
              >
                Tutti
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={tagMode === "any"}
                onClick={() => setTagMode("any")}
                className={pillButtonClasses(tagMode === "any")}
              >
                Almeno uno
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                aria-pressed={selectedTagIds.includes(tag.id)}
                onClick={() => toggleTag(tag.id)}
                className={pillButtonClasses(selectedTagIds.includes(tag.id))}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-border pt-4">
        <p className="text-sm font-medium text-foreground">Cosa posso cucinare?</p>
        <p className="mb-3 text-sm text-muted-foreground">Aggiungi gli ingredienti che hai già a disposizione.</p>
        <div className="mb-2 flex flex-wrap gap-2">
          {ingredients.map((term) => (
            <Badge key={term} variant="accent" size="md">
              {term}
              <button
                type="button"
                onClick={() => setIngredients((prev) => prev.filter((t) => t !== term))}
                aria-label={`Rimuovi ${term}`}
                className="text-primary/70 hover:text-primary"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </Badge>
          ))}
        </div>
        <Input
          type="text"
          list="search-ingredient-suggestions"
          placeholder="Es. pomodoro, poi invio"
          value={ingredientInput}
          onChange={(e) => setIngredientInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addIngredient();
            }
          }}
          onBlur={addIngredient}
        />
        <datalist id="search-ingredient-suggestions">
          {ingredientSuggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-3">
        <Input
          label="Prep. entro (min)"
          type="number"
          min={0}
          placeholder="es. 30"
          value={prepMax}
          onChange={(e) => setPrepMax(e.target.value)}
        />
        <Input
          label="Cottura entro (min)"
          type="number"
          min={0}
          placeholder="es. 30"
          value={cookMax}
          onChange={(e) => setCookMax(e.target.value)}
        />
        <Input
          label="Porzioni almeno"
          type="number"
          min={1}
          placeholder="es. 4"
          value={servingsMin}
          onChange={(e) => setServingsMin(e.target.value)}
        />
      </div>

      <div className="border-t border-border pt-4">
        <p className="mb-2 text-sm font-medium text-foreground">Valutazione minima</p>
        <div className="flex flex-wrap gap-2">
          {RATING_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={ratingMin === String(r)}
              onClick={() => setRatingMin(ratingMin === String(r) ? "" : String(r))}
              className={pillButtonClasses(ratingMin === String(r))}
            >
              {r}+
            </button>
          ))}
        </div>
      </div>
      </div>
      </Card>

      <section aria-live="polite">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold text-foreground">Risultati</h2>
          <div className="flex items-center gap-3">
            {status === "done" && <span className="text-sm text-muted-foreground">{results.length} {results.length === 1 ? "ricetta" : "ricette"}</span>}
            <Select
              aria-label="Ordina per"
              value={sort}
              onChange={(e) => setExplicitSort(e.target.value as Sort)}
              className="w-auto min-h-9 py-1 text-sm"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      <div>
        {status === "loading" && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="list-row h-[88px] border-transparent shadow-none" />
            ))}
          </div>
        )}
        {status === "done" && results.length > 0 && <RecipeList recipes={results} />}
        {status === "done" && results.length === 0 && <EmptyState title="Nessuna ricetta trovata" description="Prova a cambiare i filtri o cerca un ingrediente diverso." />}
      </div>
      </section>
    </div>
  );
}
