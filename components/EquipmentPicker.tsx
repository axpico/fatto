"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

export function EquipmentPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (equipment: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function addItem(raw: string) {
    const name = raw.trim();
    if (!name || value.includes(name)) return;
    onChange([...value, name]);
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
              onClick={() => onChange(value.filter((t) => t !== item))}
              className="text-primary/70 hover:text-primary"
              aria-label={`Rimuovi ${item}`}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addItem(input);
          }
        }}
        onBlur={() => addItem(input)}
        placeholder="Aggiungi un utensile e premi invio"
      />
    </div>
  );
}
