import { useToast } from "@/components/ui/Toast";
import { reportIfFailed } from "@/lib/apiError";

export type CookLogPatch = { rating?: number | null; notes?: string | null };

/** Shared PATCH/POST/DELETE calls against the cook-log endpoints. List bookkeeping (optimistic
 * updates, rollback) stays with each caller since CookLogSection tracks a list and
 * CookingModeViewer tracks a single id — only the fetch shape is duplicated, not the state shape. */
export function useCookLog(recipeId: string) {
  const toast = useToast();

  async function markCooked<T>(): Promise<T | null> {
    const res = await fetch(`/api/recipes/${recipeId}/cook-log`, { method: "POST" });
    if (await reportIfFailed(res, toast)) return null;
    return res.json();
  }

  async function patchCookLog(id: string, patch: CookLogPatch): Promise<boolean> {
    const res = await fetch(`/api/cook-logs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    return !(await reportIfFailed(res, toast));
  }

  async function deleteCookLog(id: string): Promise<boolean> {
    const res = await fetch(`/api/cook-logs/${id}`, { method: "DELETE" });
    return !(await reportIfFailed(res, toast));
  }

  return { markCooked, patchCookLog, deleteCookLog };
}
