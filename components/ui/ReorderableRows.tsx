"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Plus, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { moveItem } from "@/lib/arrayMove";

function newKey() {
  return crypto.randomUUID();
}

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

  // Rows carry no stable id and update() spreads a fresh object on every keystroke, so neither
  // index nor object identity is a safe React key for the FLIP reorder animation below. We keep a
  // parallel array of generated keys, mutated in lockstep with every move/add/remove this
  // component performs. ponytail: if a parent ever swaps in a same-length-but-reordered items
  // array *without* going through these handlers, this resync can't tell and the animation will
  // misattribute rows to keys — upgrade path is a real stable `id` on the row type.
  const [keys, setKeys] = useState<string[]>(() => items.map(newKey));
  if (keys.length !== items.length) {
    setKeys(items.map((_, i) => keys[i] ?? newKey()));
  }

  function move(from: number, to: number) {
    onChange(moveItem(items, from, to));
    setKeys((k) => moveItem(k, from, to));
  }

  function update(index: number, patch: Partial<T>) {
    onChange(items.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
    setKeys((k) => k.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...items, onAdd()]);
    setKeys((k) => [...k, newKey()]);
  }

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {items.map((row, index) => (
          <motion.div
            key={keys[index] ?? index}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null && dragIndex !== index) move(dragIndex, index);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
            className={`rounded-lg bg-surface-sunken p-2 transition-opacity ${dragIndex === index ? "opacity-40" : ""}`}
          >
            <div className="flex items-start gap-2">
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  onClick={() => move(index, index - 1)}
                  disabled={index === 0}
                  aria-label={`Sposta ${itemLabel} su`}
                  className="flex min-h-11 min-w-11 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, index + 1)}
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
          </motion.div>
        ))}
      </AnimatePresence>
      <Button type="button" variant="secondary" size="sm" onClick={add} className="border-dashed">
        <Plus className="h-4 w-4" aria-hidden="true" /> {addLabel}
      </Button>
    </div>
  );
}
