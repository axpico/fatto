"use client";

import { Button } from "@/components/ui/Button";

export function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()} className="print:hidden mb-4">
      Stampa / Salva PDF
    </Button>
  );
}
