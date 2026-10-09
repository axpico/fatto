"use client";

import Link from "next/link";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export function RouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="p-4">
      <EmptyState
        title="Qualcosa è andato storto"
        description={`Riprova, oppure torna alle ricette.${error.digest ? ` Codice: ${error.digest}` : ""}`}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" onClick={() => retry()}>
              Riprova
            </Button>
            <Link href="/" className={buttonClasses("secondary", "md")}>
              Torna alle ricette
            </Link>
          </div>
        }
      />
    </div>
  );
}
