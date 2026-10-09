"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { reportIfFailed } from "@/lib/clientFetch";
import { deferCommit } from "@/lib/deferCommit";
import { hideRecipe, unhideRecipe } from "@/lib/pendingDeletes";

const UNDO_WINDOW_MS = 6000;

// No confirm dialog: deletion is undoable from the toast for UNDO_WINDOW_MS, the DELETE is only
// sent once that window closes (or on tab close).
export function DeleteRecipeButton({ recipeId, title }: { recipeId: string; title: string }) {
  const router = useRouter();
  const toast = useToast();

  function handleDelete() {
    hideRecipe(recipeId);
    const cancel = deferCommit(async () => {
      const res = await fetch(`/api/recipes/${recipeId}`, { method: "DELETE", keepalive: true });
      if (await reportIfFailed(res, toast)) {
        unhideRecipe(recipeId);
        return;
      }
      router.refresh();
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
    <Button type="button" variant="destructive" size="sm" onClick={handleDelete}>
      Elimina
    </Button>
  );
}
