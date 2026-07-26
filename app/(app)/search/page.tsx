"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { RecipeCard, type RecipeCardData } from "@/components/RecipeCard";
import { Input } from "@/components/ui/Input";
import { Badge, pillButtonClasses } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Tag = { id: string; name: string };

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

  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    () => searchParams.get("tags")?.split(",").filter(Boolean) ?? [],
  );
  const [ingredientInput, setIngredientInput] = useState("");
  const [ingredients, setIngredients] = useState<string[]>(
    () => searchParams.get("ingredients")?.split(",").filter(Boolean) ?? [],
  );
  const [ingredientSuggestions, setIngredientSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<RecipeCardData[]>([]);
  const [status, setStatus] = useState<"loading" | "done">("loading");

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
    if (ingredients.length > 0) params.set("ingredients", ingredients.join(","));

    const handle = setTimeout(() => {
      router.replace(params.size > 0 ? `/search?${params}` : "/search", { scroll: false });
      setStatus("loading");
      fetch(`/api/recipes?${params}`)
        .then((res) => res.json())
        .then((data) => {
          setResults(data);
          setStatus("done");
        });
    }, 200);

    return () => clearTimeout(handle);
  }, [query, selectedTagIds, ingredients, router]);

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  function addIngredient() {
    const term = ingredientInput.trim().toLowerCase();
    if (!term || ingredients.includes(term)) return;
    setIngredients((prev) => [...prev, term]);
    setIngredientInput("");
  }

  const hasActiveFilters = query.trim() !== "" || selectedTagIds.length > 0 || ingredients.length > 0;

  function clearFilters() {
    setQuery("");
    setSelectedTagIds([]);
    setIngredients([]);
    setIngredientInput("");
  }

  return (
    <div className="page-shell max-w-3xl space-y-6">
      <div className="page-header mb-0 rounded-xl border border-border bg-surface-secondary/70 p-5 sm:p-6">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-primary"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Scopri cosa cucinare</p>
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
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary"><SlidersHorizontal className="h-4 w-4" aria-hidden="true" /></span>
          <div>
            <h2 className="font-medium text-foreground">Trova la ricetta giusta</h2>
            <p className="text-sm text-muted-foreground">Cerca per nome o restringi i risultati con i filtri.</p>
          </div>
        </div>
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

      {tags.length > 0 && (
        <div className="border-t border-border pt-4">
          <p className="mb-2 text-sm font-medium text-foreground">Filtra per tag</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
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
      </Card>

      <section aria-live="polite">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-foreground">Risultati</h2>
          {status === "done" && <span className="text-sm text-muted-foreground">{results.length} {results.length === 1 ? "ricetta" : "ricette"}</span>}
        </div>
      <div className="space-y-3">
        {results.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
        {status === "loading" && (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        )}
        {status === "done" && results.length === 0 && <EmptyState title="Nessuna ricetta trovata" description="Prova a cambiare i filtri o cerca un ingrediente diverso." />}
      </div>
      </section>
    </div>
  );
}
