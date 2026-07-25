"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { RecipeCard, type RecipeCardData } from "@/components/RecipeCard";
import { Input } from "@/components/ui/Input";
import { Badge, pillButtonClasses } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type Tag = { id: string; name: string };

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [ingredientInput, setIngredientInput] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [results, setResults] = useState<RecipeCardData[]>([]);

  useEffect(() => {
    fetch("/api/tags")
      .then((res) => res.json())
      .then(setTags);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (selectedTagIds.length > 0) params.set("tags", selectedTagIds.join(","));
    if (ingredients.length > 0) params.set("ingredients", ingredients.join(","));

    const handle = setTimeout(() => {
      fetch(`/api/recipes?${params}`)
        .then((res) => res.json())
        .then(setResults);
    }, 200);

    return () => clearTimeout(handle);
  }, [query, selectedTagIds, ingredients]);

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  function addIngredient() {
    const term = ingredientInput.trim().toLowerCase();
    if (!term || ingredients.includes(term)) return;
    setIngredients((prev) => [...prev, term]);
    setIngredientInput("");
  }

  return (
    <div className="space-y-5 p-4">
      <h1 className="text-lg font-semibold text-foreground">Cerca ricette</h1>

      <Input
        type="search"
        placeholder="Cerca per titolo o descrizione"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {tags.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-medium text-foreground">Tag</p>
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

      <div>
        <p className="mb-1 text-sm font-medium text-foreground">Cosa cucino con quello che ho</p>
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
      </div>

      <div className="space-y-3">
        {results.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
        {results.length === 0 && <EmptyState title="Nessuna ricetta trovata" />}
      </div>
    </div>
  );
}
