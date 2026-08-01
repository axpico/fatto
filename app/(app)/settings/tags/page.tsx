"use client";

import { useEffect, useRef, useState } from "react";
import { Merge } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { loadJson, reportIfFailed } from "@/lib/apiError";
import type { DuplicatePair } from "@/app/api/tags/duplicates/route";

const UNDO_WINDOW_MS = 5000;

export default function TagDuplicatesPage() {
  const toast = useToast();
  const [pairs, setPairs] = useState<DuplicatePair[] | null>(null);
  const pendingMerges = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  function load() {
    loadJson<DuplicatePair[]>("/api/tags/duplicates", toast, setPairs);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- toast identity is stable, omitted to avoid re-running the load on every render
  useEffect(load, []);

  useEffect(() => {
    const pending = pendingMerges.current;
    return () => {
      pending.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  function merge(pair: DuplicatePair, keepId: string, mergeId: string, keepName: string, mergeName: string, key: string) {
    setPairs((prev) => (prev ? prev.filter((p) => `${p.aId}-${p.bId}` !== key) : prev));

    const timeout = setTimeout(async () => {
      pendingMerges.current.delete(key);
      const res = await fetch("/api/tags/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepId, mergeId }),
      });
      if (await reportIfFailed(res, toast)) return;
      toast.success("Tag uniti");
    }, UNDO_WINDOW_MS);
    pendingMerges.current.set(key, timeout);

    toast.withAction(
      `"${mergeName}" unito con "${keepName}"`,
      {
        label: "Annulla",
        onClick: () => {
          const pending = pendingMerges.current.get(key);
          if (pending) {
            clearTimeout(pending);
            pendingMerges.current.delete(key);
          }
          setPairs((prev) => (prev ? [pair, ...prev] : prev));
        },
      },
      { duration: UNDO_WINDOW_MS },
    );
  }

  return (
    <div className="page-shell max-w-lg space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tag simili</h1>
          <p className="page-description">Unisci i tag quasi-duplicati creati dall&apos;estrazione automatica.</p>
        </div>
      </div>

      {pairs === null && (
        <div className="flex justify-center p-8">
          <Spinner />
        </div>
      )}

      {pairs?.length === 0 && (
        <EmptyState title="Nessun duplicato trovato" description="I tag sembrano già puliti." />
      )}

      {pairs && pairs.length > 0 && (
        <div className="space-y-3">
          {pairs.map((pair) => {
            const key = `${pair.aId}-${pair.bId}`;
            return (
              <Card key={key} className="flex items-center justify-between gap-3 p-4">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{pair.aName}</span>
                  {" ↔ "}
                  <span className="font-medium">{pair.bName}</span>
                </p>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => merge(pair, pair.aId, pair.bId, pair.aName, pair.bName, key)}
                  >
                    <Merge className="h-3.5 w-3.5" aria-hidden="true" /> Tieni &quot;{pair.aName}&quot;
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => merge(pair, pair.bId, pair.aId, pair.bName, pair.aName, key)}
                  >
                    <Merge className="h-3.5 w-3.5" aria-hidden="true" /> Tieni &quot;{pair.bName}&quot;
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
