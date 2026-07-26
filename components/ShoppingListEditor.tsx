"use client";

import { useEffect, useState } from "react";
import { X, Plus } from "lucide-react";
import { inputClasses } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Checkbox } from "@/components/ui/Checkbox";
import { useToast } from "@/components/ui/Toast";
import { reportIfFailed } from "@/lib/apiError";

type Item = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  checked: boolean;
};

function formatQuantity(item: Item) {
  if (item.quantity === null) return "";
  const n = Number(item.quantity.toFixed(2)).toString().replace(".", ",");
  return `${n} ${item.unit ?? ""}`.trim();
}

export function ShoppingListEditor({
  initialItems,
  generateRange,
}: {
  initialItems: Item[];
  generateRange: { from: string; to: string } | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [generating, setGenerating] = useState(!!generateRange);
  const toast = useToast();

  useEffect(() => {
    if (!generateRange) return;
    fetch("/api/shopping-list/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: generateRange.from, endDate: generateRange.to }),
    }).then(async (res) => {
      if (await reportIfFailed(res, toast)) {
        setGenerating(false);
        return;
      }
      setItems(await res.json());
      setGenerating(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle(item: Item) {
    const previous = items;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)));
    const res = await fetch(`/api/shopping-list/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked: !item.checked }),
    });
    if (await reportIfFailed(res, toast)) setItems(previous);
  }

  async function remove(id: string) {
    const previous = items;
    setItems((prev) => prev.filter((i) => i.id !== id));
    const res = await fetch(`/api/shopping-list/${id}`, { method: "DELETE" });
    if (await reportIfFailed(res, toast)) setItems(previous);
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await fetch("/api/shopping-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        quantity: quantity ? Number(quantity) : null,
        unit: unit.trim() || null,
      }),
    });
    if (await reportIfFailed(res, toast)) return;
    const item = await res.json();
    setItems((prev) => [...prev, item]);
    setName("");
    setQuantity("");
    setUnit("");
  }

  return (
    <div>
      {generating && (
        <p className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Generazione in corso...
        </p>
      )}

      <form onSubmit={addManual} className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Aggiungi articolo"
          aria-label="Nome articolo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`flex-1 ${inputClasses}`}
        />
        <input
          type="number"
          step="any"
          placeholder="Qtà"
          aria-label="Quantità"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className={`w-16 ${inputClasses}`}
        />
        <input
          type="text"
          placeholder="Unità"
          aria-label="Unità"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className={`w-16 ${inputClasses}`}
        />
        <Button type="submit" size="sm" aria-label="Aggiungi articolo">
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>

      {items.length === 0 ? (
        <EmptyState title="Lista della spesa vuota" description="Aggiungi un articolo o genera la lista da un piano settimanale." />
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface-sunken px-3 py-2"
            >
              <Checkbox
                checked={item.checked}
                onChange={() => toggle(item)}
                aria-label={`Segna ${item.name} come preso`}
                className="h-5 w-5"
              />
              <span className={`flex-1 ${item.checked ? "text-muted-foreground line-through" : "text-foreground"}`}>
                {item.name}
                {item.quantity !== null && (
                  <span className="ml-2 text-sm text-muted-foreground">{formatQuantity(item)}</span>
                )}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(item.id)}
                aria-label="Rimuovi articolo"
                className="px-2 hover:text-destructive"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
