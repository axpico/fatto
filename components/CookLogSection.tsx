"use client";

import { useRef, useState } from "react";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog, type ConfirmDialogHandle } from "@/components/ui/ConfirmDialog";

type CookLog = {
  id: string;
  cookedAt: string;
  rating: number | null;
  notes: string | null;
  user: { name: string };
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
}

function StarRating({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (rating: number) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} stelle`}
          className={n <= (value ?? 0) ? "text-amber-500" : "text-muted-foreground"}
        >
          <Star className="h-4 w-4" fill={n <= (value ?? 0) ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

export function CookLogSection({
  recipeId,
  initialLogs,
}: {
  recipeId: string;
  initialLogs: CookLog[];
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [marking, setMarking] = useState(false);
  const dialogRef = useRef<ConfirmDialogHandle>(null);

  async function markCooked() {
    setMarking(true);
    const res = await fetch(`/api/recipes/${recipeId}/cook-log`, { method: "POST" });
    setMarking(false);
    if (res.ok) {
      const log = await res.json();
      setLogs((prev) => [log, ...prev]);
    }
  }

  async function patchLog(id: string, patch: Partial<Pick<CookLog, "rating" | "notes">>) {
    setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    await fetch(`/api/cook-logs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function removeLog(id: string) {
    const confirmed = await dialogRef.current?.open();
    if (!confirmed) return;
    setLogs((prev) => prev.filter((l) => l.id !== id));
    await fetch(`/api/cook-logs/${id}`, { method: "DELETE" });
  }

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold text-foreground">
          Storico {logs.length > 0 && <span className="text-muted-foreground">· cucinata {logs.length} volte</span>}
        </h2>
        <Button type="button" size="sm" onClick={markCooked} disabled={marking}>
          Segna come cucinata
        </Button>
      </div>

      {logs.length === 0 ? (
        <EmptyState title="Non ancora cucinata" />
      ) : (
        <ul className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} className="p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">
                  {formatDate(log.cookedAt)} · {log.user.name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLog(log.id)}
                  aria-label="Rimuovi voce"
                  className="px-2 hover:text-destructive"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <div className="mt-1">
                <StarRating value={log.rating} onChange={(rating) => patchLog(log.id, { rating })} />
              </div>
              <textarea
                placeholder="Note (opzionale)"
                defaultValue={log.notes ?? ""}
                onBlur={(e) => patchLog(log.id, { notes: e.target.value || null })}
                rows={1}
                className={`mt-2 text-sm ${inputClasses}`}
              />
            </Card>
          ))}
        </ul>
      )}

      <ConfirmDialog
        ref={dialogRef}
        title="Rimuovere questa voce dallo storico?"
        confirmLabel="Rimuovi"
      />
    </section>
  );
}
