"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, type ConfirmDialogHandle } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { NETWORK_ERROR, reportIfFailed } from "@/lib/clientFetch";
import { deferCommit } from "@/lib/deferCommit";
import { hideRecipe, unhideRecipe } from "@/lib/pendingDeletes";

const UNDO_WINDOW_MS = 6000;

// Asks for confirmation first; after that the deletion is still undoable from the toast for
// UNDO_WINDOW_MS, the DELETE is only sent once that window closes (or on tab close).
export function DeleteRecipeButton({ recipeId, title }: { recipeId: string; title: string }) {
  const router = useRouter();
  const toast = useToast();
  const dialogRef = useRef<ConfirmDialogHandle>(null);

  async function handleDelete() {
    if (!(await dialogRef.current?.open())) return;
    hideRecipe(recipeId);
    const cancel = deferCommit(async () => {
      try {
        const res = await fetch(`/api/recipes/${recipeId}`, { method: "DELETE", keepalive: true });
        if (await reportIfFailed(res, toast)) {
          unhideRecipe(recipeId);
          return;
        }
        router.refresh();
      } catch {
        unhideRecipe(recipeId);
        toast.error(`"${title}" non è stata eliminata: ${NETWORK_ERROR}`);
      }
    }, UNDO_WINDOW_MS);
    router.push("/");
    toast.withAction(
      `"${title}" eliminata`,
      {
        label: "Annulla",
        onClick: () => {
          cancel();
          unhideRecipe(recipeId);
          router.push(`/recipes/${recipeId}`);
        },
      },
      { duration: UNDO_WINDOW_MS },
    );
  }

  return (
    <>
      <Button type="button" variant="destructive" size="sm" onClick={handleDelete}>
        Elimina
      </Button>
      <ConfirmDialog ref={dialogRef} title={`Eliminare "${title}"?`} confirmLabel="Elimina" />
    </>
  );
}
