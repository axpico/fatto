"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, type ConfirmDialogHandle } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { reportIfFailed } from "@/lib/clientFetch";

export function DeleteRecipeButton({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const toast = useToast();
  const dialogRef = useRef<ConfirmDialogHandle>(null);

  async function handleDelete() {
    const confirmed = await dialogRef.current?.open();
    if (!confirmed) return;
    const res = await fetch(`/api/recipes/${recipeId}`, { method: "DELETE" });
    if (await reportIfFailed(res, toast)) return;
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <Button type="button" variant="destructive" size="sm" onClick={handleDelete}>
        Elimina
      </Button>
      <ConfirmDialog
        ref={dialogRef}
        title="Eliminare questa ricetta?"
        description="L'operazione non è reversibile."
        confirmLabel="Elimina"
      />
    </>
  );
}
