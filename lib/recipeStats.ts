export type CookStats = {
  timesCooked: number;
  avgRating: number | null;
  lastCookedAt: Date | null;
};

export type HomeSort = "recent" | "most-cooked" | "top-rated" | "stale";

export function computeCookStats(logs: { rating: number | null; cookedAt: Date }[]): CookStats {
  const rated = logs.filter((l) => l.rating !== null);
  const avgRating = rated.length > 0 ? rated.reduce((sum, l) => sum + l.rating!, 0) / rated.length : null;
  const lastCookedAt = logs.reduce<Date | null>(
    (latest, l) => (latest === null || l.cookedAt > latest ? l.cookedAt : latest),
    null,
  );
  return { timesCooked: logs.length, avgRating, lastCookedAt };
}

export function compareBySort<T extends CookStats>(sort: HomeSort, a: T, b: T): number {
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
    default:
      return 0;
  }
}
