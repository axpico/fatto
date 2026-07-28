"use client";

import { useEffect, useState } from "react";
import { Merge } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { reportIfFailed } from "@/lib/apiError";
import type { DuplicatePair } from "@/app/api/tags/duplicates/route";

export default function TagDuplicatesPage() {
  const toast = useToast();
  const [pairs, setPairs] = useState<DuplicatePair[] | null>(null);
  const [mergingKey, setMergingKey] = useState<string | null>(null);

  function load() {
    fetch("/api/tags/duplicates")
      .then((res) => res.json())
      .then(setPairs);
  }

  useEffect(load, []);

  async function merge(keepId: string, mergeId: string, key: string) {
    setMergingKey(key);
    const res = await fetch("/api/tags/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keepId, mergeId }),
    });
    setMergingKey(null);
    if (await reportIfFailed(res, toast)) return;
    toast.success("Tag uniti");
    setPairs(null);
    load();
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
                    disabled={mergingKey === key}
                    onClick={() => merge(pair.aId, pair.bId, key)}
                  >
                    <Merge className="h-3.5 w-3.5" aria-hidden="true" /> Tieni &quot;{pair.aName}&quot;
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={mergingKey === key}
                    onClick={() => merge(pair.bId, pair.aId, key)}
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
