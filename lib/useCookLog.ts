import { useToast } from "@/components/ui/Toast";
import { NETWORK_ERROR, reportIfFailed } from "@/lib/clientFetch";

type CookLogPatch = { rating?: number | null; notes?: string | null };

/** Shared PATCH/POST/DELETE calls against the cook-log endpoints. List bookkeeping (optimistic
 * updates, rollback) stays with each caller since CookLogSection tracks a list and
 * CookingModeViewer tracks a single id — only the fetch shape is duplicated, not the state shape. */
export function useCookLog(recipeId: string) {
  const toast = useToast();

  // network errors resolve to null/false like HTTP errors, so callers' "pending" flags always reset
  async function send(url: string, init: RequestInit): Promise<Response | null> {
    try {
      const res = await fetch(url, init);
      return (await reportIfFailed(res, toast)) ? null : res;
    } catch {
      toast.error(NETWORK_ERROR);
      return null;
    }
  }

  async function markCooked<T>(): Promise<T | null> {
    const res = await send(`/api/recipes/${recipeId}/cook-log`, { method: "POST" });
    return res ? res.json() : null;
  }

  async function patchCookLog(id: string, patch: CookLogPatch): Promise<boolean> {
    const res = await send(`/api/cook-logs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    return res !== null;
  }

  async function deleteCookLog(id: string): Promise<boolean> {
    return (await send(`/api/cook-logs/${id}`, { method: "DELETE" })) !== null;
  }

  return { markCooked, patchCookLog, deleteCookLog };
}
