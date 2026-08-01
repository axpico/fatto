"use client";

import { useState, type ReactNode } from "react";
import { X, Plus, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { moveItem } from "@/lib/arrayMove";

export function ReorderableRows<T>({
  items,
  onChange,
  itemLabel,
  addLabel,
  onAdd,
  renderFields,
  renderOptional,
}: {
  items: T[];
  onChange: (rows: T[]) => void;
  /** Used in aria-labels, e.g. "ingrediente" / "passaggio". */
  itemLabel: string;
  addLabel: string;
  onAdd: () => T;
  renderFields: (item: T, index: number, update: (patch: Partial<T>) => void) => ReactNode;
  renderOptional?: (item: T, index: number, update: (patch: Partial<T>) => void) => ReactNode;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function update(index: number, patch: Partial<T>) {
    onChange(items.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      {items.map((row, index) => (
        <div
          key={index}
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragIndex !== null && dragIndex !== index) onChange(moveItem(items, dragIndex, index));
            setDragIndex(null);
          }}
          onDragEnd={() => setDragIndex(null)}
          className={`rounded-lg bg-surface-sunken p-2 transition-opacity ${dragIndex === index ? "opacity-40" : ""}`}
        >
          <div className="flex items-start gap-2">
            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                onClick={() => onChange(moveItem(items, index, index - 1))}
                disabled={index === 0}
                aria-label={`Sposta ${itemLabel} su`}
                className="flex min-h-11 min-w-11 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onChange(moveItem(items, index, index + 1))}
                disabled={index === items.length - 1}
                aria-label={`Sposta ${itemLabel} giù`}
                className="flex min-h-11 min-w-11 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            {renderFields(row, index, (patch) => update(index, patch))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(index)}
              aria-label={`Rimuovi ${itemLabel}`}
              className="min-h-11 min-w-11 justify-center px-2 hover:text-destructive"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          {renderOptional && (
            <div className="mt-1.5 pl-7">{renderOptional(row, index, (patch) => update(index, patch))}</div>
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onChange([...items, onAdd()])}
        className="border-dashed"
      >
        <Plus className="h-4 w-4" aria-hidden="true" /> {addLabel}
      </Button>
    </div>
  );
}
