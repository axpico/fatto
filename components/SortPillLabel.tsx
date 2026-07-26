"use client";

import { useLinkStatus } from "next/link";
import { Spinner } from "@/components/ui/Spinner";

// Deve stare dentro il <Link>: useLinkStatus legge lo stato di navigazione del Link antenato più vicino.
export function SortPillLabel({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return pending ? (
    <span className="inline-flex items-center gap-1.5">
      <Spinner className="h-3.5 w-3.5" /> {label}
    </span>
  ) : (
    label
  );
}
