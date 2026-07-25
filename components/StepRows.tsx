"use client";

import { X, Plus } from "lucide-react";
import { inputClasses } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export type StepRow = { instruction: string; timerMinutes: number | null };

export function StepRows({
  value,
  onChange,
}: {
  value: StepRow[];
  onChange: (rows: StepRow[]) => void;
}) {
  function update(index: number, patch: Partial<StepRow>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...value, { instruction: "", timerMinutes: null }]);
  }

  return (
    <div className="space-y-2">
      {value.map((row, index) => (
        <div key={index} className="flex gap-2">
          <span className="pt-2 text-sm font-medium text-muted-foreground">{index + 1}.</span>
          <textarea
            placeholder="Descrivi il passaggio"
            value={row.instruction}
            onChange={(e) => update(index, { instruction: e.target.value })}
            rows={2}
            className={`flex-1 ${inputClasses}`}
          />
          <input
            type="number"
            placeholder="Min"
            value={row.timerMinutes ?? ""}
            onChange={(e) =>
              update(index, { timerMinutes: e.target.value ? Number(e.target.value) : null })
            }
            className={`w-16 self-start ${inputClasses}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => remove(index)}
            aria-label="Rimuovi passaggio"
            className="self-start px-2 hover:text-destructive"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={add} className="border-dashed">
        <Plus className="h-4 w-4" aria-hidden="true" /> Aggiungi passaggio
      </Button>
    </div>
  );
}
