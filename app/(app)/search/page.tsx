"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Clock, Search, SlidersHorizontal, Star, Users, X } from "lucide-react";
import { type RecipeCardData } from "@/components/RecipeCard";
import { RecipeList, VIEW_STORAGE_KEY, VIEW_EVENT, resolveRecipeView } from "@/components/RecipeList";
import { TagFilterPanel } from "@/components/TagFilterPanel";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge, pillButtonClasses } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { loadJson, readErrorMessage } from "@/lib/clientFetch";
import { RECIPE_SORTS, type RecipeSort } from "@/lib/recipeStats";
import { useSuggestions } from "@/lib/useSuggestions";
import { useLocalStorageSync } from "@/lib/useLocalStorageSync";
import { ChipInput } from "@/components/ui/ChipInput";

type Tag = { id: string; name: string };
type TagMode = "all" | "any";
type Sort = "relevance" | "best-match" | RecipeSort;

const RATING_OPTIONS = [3, 4, 5];
const TIME_OPTIONS = [15, 30, 45, 60];

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
  const [ingredients, setIngredients] = useState<string[]>(
    () => searchParams.get("ingredients")?.split(",").filter(Boolean) ?? [],
  );
  const ingredientSuggestions = useSuggestions<{ name: string }>("/api/ingredients", (r) => r.name);
  const [prepMax, setPrepMax] = useState(() => searchParams.get("prepMax") ?? "");
  const [cookMax, setCookMax] = useState(() => searchParams.get("cookMax") ?? "");
  const [servingsMin, setServingsMin] = useState(() => searchParams.get("servingsMin") ?? "");
  const [ratingMin, setRatingMin] = useState(() => searchParams.get("ratingMin") ?? "");
  const [favoritesOnly, setFavoritesOnly] = useState(() => searchParams.get("favorites") === "1");
  const [explicitSort, setExplicitSort] = useState<Sort | null>(() => (searchParams.get("sort") as Sort) ?? null);
  const [results, setResults] = useState<RecipeCardData[]>([]);
  const [status, setStatus] = useState<"loading" | "done">("loading");
  // after the first load, refetches keep the previous results on screen (no skeleton flash per keystroke)
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [view] = useLocalStorageSync(VIEW_STORAGE_KEY, VIEW_EVENT, resolveRecipeView, "list");
  const queryInputRef = useRef<HTMLInputElement>(null);

  // finché l'utente non sceglie un sort esplicito, lo deriviamo dal filtro più specifico attivo
  const sort: Sort = explicitSort ?? (ingredients.length > 0 ? "best-match" : query.trim() ? "relevance" : "recent");

  useEffect(() => {
    loadJson<Tag[]>("/api/tags", toast, setTags);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once per mount, toast identity is stable
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
    if (favoritesOnly) params.set("favorites", "1");
    if (explicitSort) params.set("sort", explicitSort);

    const controller = new AbortController();
    const handle = setTimeout(() => {
      router.replace(params.size > 0 ? `/search?${params}` : "/search", { scroll: false });
      setStatus("loading");
      fetch(`/api/recipes?${params}`, { signal: controller.signal })
        .then(async (res) => {
          if (!res.ok) throw new Error(await readErrorMessage(res, "Ricerca non riuscita, riprova."));
          return res.json();
        })
        .then((data) => {
          setResults(data);
          setStatus("done");
          setLoadedOnce(true);
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          toast.error(err.message || "Ricerca non riuscita, riprova.");
          setStatus("done");
          setLoadedOnce(true);
        });
    }, 200);

    return () => {
      clearTimeout(handle);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast identity is stable, omitted to avoid re-running the search on every render
  }, [query, selectedTagIds, tagMode, ingredients, prepMax, cookMax, servingsMin, ratingMin, favoritesOnly, explicitSort, sort, router]);

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  // on a phone the keyboard would cover filters and results: autofocus only with a mouse
  useEffect(() => {
    if (!searchParams.get("q") && window.matchMedia("(pointer: fine)").matches) queryInputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  const hasActiveFilters =
    query.trim() !== "" ||
    selectedTagIds.length > 0 ||
    ingredients.length > 0 ||
    prepMax !== "" ||
    cookMax !== "" ||
    servingsMin !== "" ||
    ratingMin !== "" ||
    favoritesOnly;

  const activeFilterCount =
    selectedTagIds.length +
    ingredients.length +
    (prepMax ? 1 : 0) +
    (cookMax ? 1 : 0) +
    (servingsMin ? 1 : 0) +
    (ratingMin ? 1 : 0) +
    (favoritesOnly ? 1 : 0);

  // Riepilogo di tutti i filtri attivi (query esclusa: è già visibile/modificabile nel campo di
  // ricerca) — mostrato solo su mobile a pannello chiuso: così si vede cosa è attivo senza
  // riaprirlo, senza duplicare i chip che il pannello aperto (sempre visibile su desktop) già mostra.
  const activeFilters: { key: string; label: string; onRemove: () => void }[] = [
    ...selectedTagIds.map((id) => ({
      key: `tag-${id}`,
      label: tags.find((t) => t.id === id)?.name ?? "…", // names load after the URL's ids
      onRemove: () => toggleTag(id),
    })),
    ...ingredients.map((term) => ({
      key: `ingredient-${term}`,
      label: term,
      onRemove: () => setIngredients((prev) => prev.filter((t) => t !== term)),
    })),
    ...(prepMax ? [{ key: "prepMax", label: `Prep. ≤ ${prepMax} min`, onRemove: () => setPrepMax("") }] : []),
    ...(cookMax ? [{ key: "cookMax", label: `Cottura ≤ ${cookMax} min`, onRemove: () => setCookMax("") }] : []),
    ...(servingsMin
      ? [{ key: "servingsMin", label: `Porzioni ≥ ${servingsMin}`, onRemove: () => setServingsMin("") }]
      : []),
    ...(ratingMin ? [{ key: "ratingMin", label: `${ratingMin}+ ★`, onRemove: () => setRatingMin("") }] : []),
    ...(favoritesOnly ? [{ key: "favorites", label: "Solo preferiti", onRemove: () => setFavoritesOnly(false) }] : []),
  ];

  // aperto di default se l'utente ha già dei filtri attivi al mount, altrimenti chiuso su mobile
  const [filtersOpen, setFiltersOpen] = useState(hasActiveFilters);

  function clearFilters() {
    setQuery("");
    setSelectedTagIds([]);
    setTagMode("all");
    setIngredients([]);
    setPrepMax("");
    setCookMax("");
    setServingsMin("");
    setRatingMin("");
    setFavoritesOnly(false);
    setExplicitSort(null);
  }

  const sortOptions: { value: Sort; label: string }[] = [
    { value: "relevance", label: "Rilevanza" },
    { value: "best-match", label: "Miglior abbinamento" },
    ...RECIPE_SORTS,
  ];

  return (
    <div className="page-shell space-y-6">
      <div className="page-header">
        <h1 className="page-title">Cerca</h1>
        {hasActiveFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            Cancella filtri
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            ref={queryInputRef}
            type="search"
            enterKeyHint="search"
            placeholder="Cerca per titolo o descrizione"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                queryInputRef.current?.focus();
              }}
              aria-label="Cancella ricerca"
              className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {activeFilters.length > 0 && !filtersOpen && (
          <div className="flex flex-wrap gap-2 sm:hidden">
            {activeFilters.map((f) => (
              <Badge key={f.key} variant="accent" size="md">
                {f.label}
                <button
                  type="button"
                  onClick={f.onRemove}
                  aria-label={`Rimuovi filtro ${f.label}`}
                  className="-my-2.5 -mr-2 flex min-h-10 min-w-10 items-center justify-center text-primary/70 hover:text-primary"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          aria-controls="search-filters-panel"
          className="w-full justify-between sm:hidden"
        >
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filtri
            {activeFilterCount > 0 && (
              <Badge variant="accent" size="sm">
                {activeFilterCount}
              </Badge>
            )}
            {filtersOpen && status === "done" && (
              <span className="font-normal text-muted-foreground">
                · {results.length} {results.length === 1 ? "ricetta" : "ricette"}
              </span>
            )}
          </span>
          {filtersOpen ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
        </Button>
      </div>

      <Card id="search-filters-panel" className={`space-y-6 p-4 sm:p-5 ${filtersOpen ? "" : "hidden sm:block"}`}>
      <div>
        <TagFilterPanel
          tags={tags}
          selectedTagIds={selectedTagIds}
          tagMode={tagMode}
          onToggleTag={toggleTag}
          onModeChange={setTagMode}
        />
      </div>

      <div>
        <p className="text-sm font-medium text-foreground">Cosa posso cucinare?</p>
        <p className="mb-3 text-sm text-muted-foreground">Aggiungi gli ingredienti che hai già a disposizione.</p>
        <ChipInput
          value={ingredients}
          onChange={setIngredients}
          placeholder="Es. pomodoro, poi invio"
          normalize={(raw) => raw.trim().toLowerCase()}
          suggestions={ingredientSuggestions}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Prep. entro (min)
          </label>
          <div className="flex flex-wrap gap-2">
            {TIME_OPTIONS.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={prepMax === String(v)}
                onClick={() => setPrepMax(prepMax === String(v) ? "" : String(v))}
                className={pillButtonClasses(prepMax === String(v))}
              >
                {v}
              </button>
            ))}
          </div>
          <Input
            type="number"
            min={0}
            placeholder="o minuti esatti"
            value={prepMax}
            onChange={(e) => setPrepMax(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Cottura entro (min)
          </label>
          <div className="flex flex-wrap gap-2">
            {TIME_OPTIONS.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={cookMax === String(v)}
                onClick={() => setCookMax(cookMax === String(v) ? "" : String(v))}
                className={pillButtonClasses(cookMax === String(v))}
              >
                {v}
              </button>
            ))}
          </div>
          <Input
            type="number"
            min={0}
            placeholder="o minuti esatti"
            value={cookMax}
            onChange={(e) => setCookMax(e.target.value)}
          />
        </div>
        <Input
          label={
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" aria-hidden="true" /> Porzioni almeno
            </span>
          }
          type="number"
          min={1}
          placeholder="es. 4"
          value={servingsMin}
          onChange={(e) => setServingsMin(e.target.value)}
        />
      </div>

      <div>
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
          <button
            type="button"
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly((v) => !v)}
            className={pillButtonClasses(favoritesOnly)}
          >
            <Star className="h-3.5 w-3.5" aria-hidden="true" /> Solo preferiti
          </button>
        </div>
      </div>

      <Button type="button" onClick={() => setFiltersOpen(false)} className="w-full sm:hidden">
        {status === "done" ? `Mostra ${results.length} ${results.length === 1 ? "ricetta" : "ricette"}` : "Mostra risultati"}
      </Button>
      </Card>

      <section aria-live="polite">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">Risultati</h2>
          <div className="flex items-center gap-3">
            {status === "loading" && loadedOnce && <Spinner className="h-4 w-4" />}
            {loadedOnce && <span className="text-sm text-muted-foreground">{results.length} {results.length === 1 ? "ricetta" : "ricette"}</span>}
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
        {!loadedOnce && view === "grid" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="aspect-[4/5] border-transparent shadow-none" />
            ))}
          </div>
        )}
        {!loadedOnce && view === "list" && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="list-row h-[88px] border-transparent shadow-none" />
            ))}
          </div>
        )}
        {loadedOnce && results.length > 0 && (
          <div className={`transition-opacity ${status === "loading" ? "opacity-60" : ""}`}>
            <RecipeList recipes={results} />
          </div>
        )}
        {status === "done" && results.length === 0 && (
          <EmptyState
            title="Nessuna ricetta trovata"
            description="Prova a cambiare i filtri o cerca un ingrediente diverso."
            action={
              hasActiveFilters ? (
                <Button type="button" variant="secondary" size="sm" onClick={clearFilters}>
                  Cancella filtri
                </Button>
              ) : undefined
            }
          />
        )}
      </div>
      </section>
    </div>
  );
}
