"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

export function TagPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    fetch("/api/tags")
      .then((res) => res.json())
      .then((tags: { name: string }[]) => setExistingTags(tags.map((t) => t.name)));
  }, []);

  function addTag(raw: string) {
    const name = raw.trim().toLowerCase();
    if (!name || value.includes(name)) return;
    onChange([...value, name]);
    setInput("");
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        {value.map((tag) => (
          <Badge key={tag} variant="accent" size="md">
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="text-primary/70 hover:text-primary"
              aria-label={`Rimuovi tag ${tag}`}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        type="text"
        list="tag-suggestions"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag(input);
          }
        }}
        onBlur={() => addTag(input)}
        placeholder="Aggiungi un tag e premi invio"
      />
      <datalist id="tag-suggestions">
        {existingTags.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>
    </div>
  );
}
