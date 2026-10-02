import { describe, it, expect } from "vitest";
import { computeCookStats, compareBySort, parseRecipeSort } from "./recipeStats";

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
    const a = { timesCooked: 1, avgRating: null, lastCookedAt: null, prepTimeMinutes: null };
    const b = { timesCooked: 5, avgRating: null, lastCookedAt: null, prepTimeMinutes: null };
    expect(compareBySort("most-cooked", a, b)).toBeGreaterThan(0);
  });

  it("sorts top-rated with unrated recipes last", () => {
    const rated = { timesCooked: 1, avgRating: 4, lastCookedAt: null, prepTimeMinutes: null };
    const unrated = { timesCooked: 1, avgRating: null, lastCookedAt: null, prepTimeMinutes: null };
    expect(compareBySort("top-rated", unrated, rated)).toBeGreaterThan(0);
    expect(compareBySort("top-rated", rated, unrated)).toBeLessThan(0);
  });

  it("sorts stale with never-cooked recipes first", () => {
    const never = { timesCooked: 0, avgRating: null, lastCookedAt: null, prepTimeMinutes: null };
    const cooked = { timesCooked: 1, avgRating: null, lastCookedAt: new Date("2026-01-01"), prepTimeMinutes: null };
    expect(compareBySort("stale", never, cooked)).toBeLessThan(0);
    expect(compareBySort("stale", cooked, never)).toBeGreaterThan(0);
  });

  it("sorts prep-time ascending with missing times last", () => {
    const base = { timesCooked: 0, avgRating: null, lastCookedAt: null };
    const quick = { ...base, prepTimeMinutes: 10 };
    const slow = { ...base, prepTimeMinutes: 60 };
    const unknown = { ...base, prepTimeMinutes: null };
    expect(compareBySort("prep-time", quick, slow)).toBeLessThan(0);
    expect(compareBySort("prep-time", unknown, quick)).toBeGreaterThan(0);
  });
});

describe("parseRecipeSort", () => {
  it("accepts known sorts and falls back to recent", () => {
    expect(parseRecipeSort("top-rated")).toBe("top-rated");
    expect(parseRecipeSort("relevance")).toBe("recent");
    expect(parseRecipeSort(null)).toBe("recent");
  });
});
