"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { inputClasses } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { reportIfFailed } from "@/lib/apiError";

type Item = { id: string; name: string; quantity: number | null; unit: string | null };

export function PantryEditor({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState(initialItems);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const toast = useToast();

  async function patch(id: string, data: Partial<Pick<Item, "quantity" | "unit">>) {
    const previous = items;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...data } : i)));
    const res = await fetch(`/api/pantry/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (await reportIfFailed(res, toast)) setItems(previous);
  }

  async function remove(id: string) {
    const previous = items;
    setItems((prev) => prev.filter((i) => i.id !== id));
    const res = await fetch(`/api/pantry/${id}`, { method: "DELETE" });
    if (await reportIfFailed(res, toast)) setItems(previous);
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await fetch("/api/pantry", {
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
    setItems((prev) => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
    setName("");
    setQuantity("");
    setUnit("");
  }

  return (
    <div>
      <form onSubmit={addManual} className="panel mb-4 flex flex-wrap gap-2 p-3">
        <input
          type="text"
          placeholder="Aggiungi alla dispensa"
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
        <Button type="submit" size="sm" aria-label="Aggiungi alla dispensa" className="min-w-10">
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          title="Dispensa vuota"
          description="Aggiungi una voce a mano, oppure spunta un articolo nella lista della spesa: viene aggiunto qui automaticamente."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="list-row flex items-center gap-2"
            >
              <span className="flex-1 text-foreground">{item.name}</span>
              <input
                type="number"
                step="any"
                value={item.quantity ?? ""}
                onChange={(e) => patch(item.id, { quantity: e.target.value ? Number(e.target.value) : null })}
                className={`w-16 ${inputClasses}`}
                aria-label={`Quantità ${item.name}`}
              />
              <input
                type="text"
                value={item.unit ?? ""}
                onChange={(e) => patch(item.id, { unit: e.target.value || null })}
                className={`w-16 ${inputClasses}`}
                aria-label={`Unità ${item.name}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(item.id)}
                aria-label="Rimuovi dalla dispensa"
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
