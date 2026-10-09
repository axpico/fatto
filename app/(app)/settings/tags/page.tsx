"use client";

import { useEffect, useState } from "react";
import { Merge } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { loadJson, reportIfFailed } from "@/lib/clientFetch";
import type { DuplicatePair } from "@/lib/tagDedupe";
import { deferCommit } from "@/lib/deferCommit";

const UNDO_WINDOW_MS = 5000;

export default function TagDuplicatesPage() {
  const toast = useToast();
  const [pairs, setPairs] = useState<DuplicatePair[] | null>(null);

  function load() {
    loadJson<DuplicatePair[]>("/api/tags/duplicates", toast, setPairs);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- toast identity is stable, omitted to avoid re-running the load on every render
  useEffect(load, []);

  function merge(pair: DuplicatePair, keepId: string, mergeId: string, keepName: string, mergeName: string, key: string) {
    setPairs((prev) => (prev ? prev.filter((p) => `${p.aId}-${p.bId}` !== key) : prev));

    // not cancelled on unmount: leaving the page within the undo window still merges
    const cancel = deferCommit(async () => {
      const res = await fetch("/api/tags/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepId, mergeId }),
        keepalive: true,
      });
      if (await reportIfFailed(res, toast)) return;
      toast.success("Tag uniti");
    }, UNDO_WINDOW_MS);

    toast.withAction(
      `"${mergeName}" unito con "${keepName}"`,
      {
        label: "Annulla",
        onClick: () => {
          cancel();
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
              <Card key={key} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{pair.aName}</span>
                  {" ↔ "}
                  <span className="font-medium">{pair.bName}</span>
                </p>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="min-w-0"
                    onClick={() => merge(pair, pair.aId, pair.bId, pair.aName, pair.bName, key)}
                  >
                    <Merge className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> <span className="truncate">Tieni &quot;{pair.aName}&quot;</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="min-w-0"
                    onClick={() => merge(pair, pair.bId, pair.aId, pair.bName, pair.aName, key)}
                  >
                    <Merge className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> <span className="truncate">Tieni &quot;{pair.bName}&quot;</span>
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
