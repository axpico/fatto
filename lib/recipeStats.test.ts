import { describe, it, expect } from "vitest";
import { computeCookStats, compareBySort, type CookStats } from "./recipeStats";

describe("computeCookStats", () => {
  it("returns nulls for no logs", () => {
    expect(computeCookStats([])).toEqual({ timesCooked: 0, avgRating: null, lastCookedAt: null });
  });

  it("excludes unrated logs from the average", () => {
    const logs = [
      { rating: null, cookedAt: new Date("2026-01-01") },
      { rating: 4, cookedAt: new Date("2026-01-02") },
      { rating: 2, cookedAt: new Date("2026-01-03") },
    ];
    const stats = computeCookStats(logs);
    expect(stats.timesCooked).toBe(3);
    expect(stats.avgRating).toBe(3);
    expect(stats.lastCookedAt).toEqual(new Date("2026-01-03"));
  });
});

describe("compareBySort", () => {
  it("sorts most-cooked descending", () => {
    const a: CookStats = { timesCooked: 1, avgRating: null, lastCookedAt: null };
    const b: CookStats = { timesCooked: 5, avgRating: null, lastCookedAt: null };
    expect(compareBySort("most-cooked", a, b)).toBeGreaterThan(0);
  });

  it("sorts top-rated with unrated recipes last", () => {
    const rated: CookStats = { timesCooked: 1, avgRating: 4, lastCookedAt: null };
    const unrated: CookStats = { timesCooked: 1, avgRating: null, lastCookedAt: null };
    expect(compareBySort("top-rated", unrated, rated)).toBeGreaterThan(0);
    expect(compareBySort("top-rated", rated, unrated)).toBeLessThan(0);
  });

  it("sorts stale with never-cooked recipes first", () => {
    const never: CookStats = { timesCooked: 0, avgRating: null, lastCookedAt: null };
    const cooked: CookStats = { timesCooked: 1, avgRating: null, lastCookedAt: new Date("2026-01-01") };
    expect(compareBySort("stale", never, cooked)).toBeLessThan(0);
    expect(compareBySort("stale", cooked, never)).toBeGreaterThan(0);
  });
});
