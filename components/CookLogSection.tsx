"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog, type ConfirmDialogHandle } from "@/components/ui/ConfirmDialog";
import { StarRating } from "@/components/ui/StarRating";
import { useCookLog } from "@/lib/useCookLog";
import { formatDate } from "@/lib/formatDate";

// ssr:false must be called from a client component — this file is one.
const CookedCelebration = dynamic(
  () => import("@/components/motion/CookedCelebration").then((m) => m.CookedCelebration),
  { ssr: false },
);

type CookLog = {
  id: string;
  cookedAt: string;
  rating: number | null;
  notes: string | null;
  user: { name: string };
};

export function CookLogSection({
  recipeId,
  initialLogs,
}: {
  recipeId: string;
  initialLogs: CookLog[];
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [marking, setMarking] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const dialogRef = useRef<ConfirmDialogHandle>(null);
  const cookLog = useCookLog(recipeId);

  async function markCooked() {
    setMarking(true);
    const log = await cookLog.markCooked<CookLog>();
    setMarking(false);
    if (log) {
      setLogs((prev) => [log, ...prev]);
      setCelebrating(true);
    }
  }

  async function patchLog(id: string, patch: Partial<Pick<CookLog, "rating" | "notes">>) {
    const previous = logs;
    setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    if (!(await cookLog.patchCookLog(id, patch))) setLogs(previous);
  }

  async function removeLog(id: string) {
    const confirmed = await dialogRef.current?.open();
    if (!confirmed) return;
    const previous = logs;
    setLogs((prev) => prev.filter((l) => l.id !== id));
    if (!(await cookLog.deleteCookLog(id))) setLogs(previous);
  }

  return (
    <section className="mt-10 border-t border-border pt-8">
      <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-title">
          Storico{" "}
          {logs.length > 0 && (
            <span key={logs.length} className="value-pulse inline-block text-muted-foreground">
              · cucinata {logs.length} volte
            </span>
          )}
        </h2>
        <Button type="button" size="sm" onClick={markCooked} disabled={marking}>
          {marking ? "Aggiornamento..." : "Segna come cucinata"}
        </Button>
        {celebrating && <CookedCelebration onDone={() => setCelebrating(false)} />}
      </div>

      {logs.length === 0 ? (
        <EmptyState title="Non ancora cucinata" />
      ) : (
        <ul className="divide-y divide-border">
          <AnimatePresence initial={false}>
            {logs.map((log) => (
              <motion.li
                key={log.id}
                layout
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="py-4 first:pt-0"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
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
                    aria-label="Note"
                    defaultValue={log.notes ?? ""}
                    onBlur={(e) => patchLog(log.id, { notes: e.target.value || null })}
                    rows={1}
                    className={`mt-2 w-full text-sm ${inputClasses}`}
                  />
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
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
