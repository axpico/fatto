"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
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
  );
}
