"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import "./globals.css";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="it">
      <body className="min-h-full font-sans">
        <div className="p-4">
          <EmptyState
            title="Qualcosa è andato storto"
            description="Riprova, oppure torna più tardi."
            action={
              <Button type="button" onClick={reset}>
                Riprova
              </Button>
            }
          />
        </div>
      </body>
    </html>
  );
}
