"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

export function ChipInput({
  value,
  onChange,
  placeholder,
  removeLabel,
  normalize = (raw) => raw.trim(),
  suggestions,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  removeLabel?: (item: string) => string;
  normalize?: (raw: string) => string;
  suggestions?: string[];
}) {
  const [input, setInput] = useState("");
  const datalistId = useId();

  function addItem(raw: string) {
    const item = normalize(raw);
    if (!item || value.includes(item)) return;
    onChange([...value, item]);
    setInput("");
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        {value.map((item) => (
          <Badge key={item} variant="accent" size="md">
            {item}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== item))}
              className="text-primary/70 hover:text-primary"
              aria-label={removeLabel ? removeLabel(item) : `Rimuovi ${item}`}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        type="text"
        list={suggestions ? datalistId : undefined}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addItem(input);
          }
        }}
        onBlur={() => addItem(input)}
        placeholder={placeholder}
      />
      {suggestions && (
        <datalist id={datalistId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </div>
  );
}
