"use client";

import { useState } from "react";
import { Search, Tag as TagIcon } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { pillButtonClasses } from "@/components/ui/Badge";

type Tag = { id: string; name: string };
type TagMode = "all" | "any";

export function TagFilterPanel({
  tags,
  selectedTagIds,
  tagMode,
  onToggleTag,
  onModeChange,
}: {
  tags: Tag[];
  selectedTagIds: string[];
  tagMode: TagMode;
  onToggleTag: (id: string) => void;
  onModeChange: (mode: TagMode) => void;
}) {
  const [filterText, setFilterText] = useState("");
  const [expanded, setExpanded] = useState(false);

  if (tags.length === 0) return null;

  const term = filterText.trim().toLowerCase();
  const matchingTags = term ? tags.filter((t) => t.name.toLowerCase().includes(term)) : tags;
  // durante la ricerca mostriamo tutti i match (è il motivo per cui si digita), altrimenti
  // il troncamento a 8 resta com'era — i tag già selezionati non spariscono mai dalla vista
  const visibleTags = term || expanded ? matchingTags : matchingTags.filter((t, i) => i < 8 || selectedTagIds.includes(t.id));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <TagIcon className="h-3.5 w-3.5" aria-hidden="true" /> Filtra per tag
        </p>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Modalità filtro tag">
          <button
            type="button"
            role="radio"
            aria-checked={tagMode === "all"}
            onClick={() => onModeChange("all")}
            className={pillButtonClasses(tagMode === "all")}
          >
            Tutti
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={tagMode === "any"}
            onClick={() => onModeChange("any")}
            className={pillButtonClasses(tagMode === "any")}
          >
            Almeno uno
          </button>
        </div>
      </div>
      {tags.length > 8 && (
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Filtra tag..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="pl-9 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {visibleTags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            aria-pressed={selectedTagIds.includes(tag.id)}
            onClick={() => onToggleTag(tag.id)}
            className={pillButtonClasses(selectedTagIds.includes(tag.id))}
          >
            {tag.name}
          </button>
        ))}
        {!term && matchingTags.length > 8 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {expanded ? "Mostra meno" : `Mostra tutti (${matchingTags.length})`}
          </button>
        )}
        {term && visibleTags.length === 0 && (
          <p className="text-sm text-muted-foreground">Nessun tag corrisponde a &ldquo;{filterText.trim()}&rdquo;.</p>
        )}
      </div>
    </div>
  );
}
