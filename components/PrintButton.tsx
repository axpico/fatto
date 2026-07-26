"use client";

import { Button } from "@/components/ui/Button";

export function PrintButton() {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()} className="print:hidden mb-6">
      Stampa / Salva PDF
    </Button>
  );
}
