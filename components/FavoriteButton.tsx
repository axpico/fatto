"use client";

import { useState, type MouseEvent } from "react";
import { Star } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { buttonClasses } from "@/components/ui/Button";
import { NETWORK_ERROR, reportIfFailed } from "@/lib/clientFetch";

export function FavoriteButton({
  recipeId,
  initialFavorite,
  className,
}: {
  recipeId: string;
  initialFavorite: boolean;
  className?: string;
}) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [pending, setPending] = useState(false);
  const [pulse, setPulse] = useState(false);
  const toast = useToast();

  async function toggle(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    const next = !favorite;
    setFavorite(next);
    setPulse(true);
    setPending(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/favorite`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite: next }),
      });
      if (await reportIfFailed(res, toast)) setFavorite(!next);
    } catch {
      setFavorite(!next);
      toast.error(NETWORK_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={favorite}
      aria-label={favorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
      className={className ?? buttonClasses("ghost", "icon")}
    >
      <Star
        className={`h-4 w-4 ${favorite ? "fill-primary text-primary" : ""} ${pulse ? "favorite-pulse" : ""}`}
        onAnimationEnd={() => setPulse(false)}
        aria-hidden="true"
      />
    </button>
  );
}
