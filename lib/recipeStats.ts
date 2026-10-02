type CookStats = {
  timesCooked: number;
  avgRating: number | null;
  lastCookedAt: Date | null;
};

/** Ordinamenti condivisi da Home e Cerca (Cerca aggiunge relevance/best-match, che dipendono dalla query). */
export const RECIPE_SORTS = [
  { value: "recent", label: "Recenti" },
  { value: "most-cooked", label: "Più cucinate" },
  { value: "top-rated", label: "Meglio valutate" },
  { value: "stale", label: "Da rifare" },
  { value: "prep-time", label: "Più veloci" },
] as const;

export type RecipeSort = (typeof RECIPE_SORTS)[number]["value"];

export function parseRecipeSort(raw: string | null | undefined): RecipeSort {
  return RECIPE_SORTS.some((s) => s.value === raw) ? (raw as RecipeSort) : "recent";
}

export function computeCookStats(logs: { rating: number | null; cookedAt: Date }[]): CookStats {
  const rated = logs.filter((l) => l.rating !== null);
  const avgRating = rated.length > 0 ? rated.reduce((sum, l) => sum + l.rating!, 0) / rated.length : null;
  const lastCookedAt = logs.reduce<Date | null>(
    (latest, l) => (latest === null || l.cookedAt > latest ? l.cookedAt : latest),
    null,
  );
  return { timesCooked: logs.length, avgRating, lastCookedAt };
}

type Sortable = CookStats & { prepTimeMinutes: number | null };

/** Ordine per i sort calcolati in JS; "recent" = 0, l'ordine del DB (createdAt desc) resta. */
export function compareBySort(sort: RecipeSort, a: Sortable, b: Sortable): number {
  switch (sort) {
    case "most-cooked":
      return b.timesCooked - a.timesCooked;
    case "top-rated":
      // niente voti = in fondo, non a pari merito con un 0
      if (a.avgRating === null) return b.avgRating === null ? 0 : 1;
      if (b.avgRating === null) return -1;
      return b.avgRating - a.avgRating;
    case "stale":
      // mai cucinate = più "da rifare" di tutte, vengono prima
      if (!a.lastCookedAt && !b.lastCookedAt) return 0;
      if (!a.lastCookedAt) return -1;
      if (!b.lastCookedAt) return 1;
      return a.lastCookedAt.getTime() - b.lastCookedAt.getTime();
    case "prep-time":
      // senza tempo = in fondo
      if (a.prepTimeMinutes === null) return b.prepTimeMinutes === null ? 0 : 1;
      if (b.prepTimeMinutes === null) return -1;
      return a.prepTimeMinutes - b.prepTimeMinutes;
    default:
      return 0;
  }
}
