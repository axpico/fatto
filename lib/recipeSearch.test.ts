import { describe, it, expect, vi } from "vitest";

const queryRawMock = vi.fn();
vi.mock("@/lib/db", () => ({ prisma: { $queryRaw: (...args: unknown[]) => queryRawMock(...args) } }));

const { searchRecipesByText } = await import("./recipeSearch");

describe("searchRecipesByText", () => {
  it("returns an empty array without querying when the term is blank", async () => {
    const result = await searchRecipesByText("   ");
    expect(result).toEqual([]);
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it("trims the term before querying and returns the ranked rows as-is", async () => {
    queryRawMock.mockResolvedValueOnce([{ recipeId: "1", rank: 0.5 }]);
    const result = await searchRecipesByText("  pasta  ");

    expect(result).toEqual([{ recipeId: "1", rank: 0.5 }]);
    // ${term} is interpolated 4x in the query (ts_rank, tsquery match, 2x ILIKE) - all must be trimmed
    expect(queryRawMock.mock.calls[0].slice(1)).toEqual(["pasta", "pasta", "pasta", "pasta"]);
  });

  it("passes through rows with rank 0 from the ILIKE fallback unchanged", async () => {
    queryRawMock.mockResolvedValueOnce([{ recipeId: "2", rank: 0 }]);
    const result = await searchRecipesByText("pasta");
    expect(result).toEqual([{ recipeId: "2", rank: 0 }]);
  });
});

describe("parseRecipeFilters", () => {
  it("parses lists, numbers and flags, ignoring garbage", async () => {
    const { parseRecipeFilters } = await import("./recipeSearch");
    const f = parseRecipeFilters(new URLSearchParams("tags=a,,b&tagMode=any&ingredients=uova&prepMax=20&cookMax=x&favorites=1"));
    expect(f).toEqual({
      tagIds: ["a", "b"],
      tagMode: "any",
      ingredientTerms: ["uova"],
      prepMax: 20,
      cookMax: null,
      servingsMin: null,
      ratingMin: null,
      favoritesOnly: true,
    });
  });

  it("defaults to all-tags mode and no favorites", async () => {
    const { parseRecipeFilters } = await import("./recipeSearch");
    const f = parseRecipeFilters(new URLSearchParams(""));
    expect(f.tagMode).toBe("all");
    expect(f.favoritesOnly).toBe(false);
  });
});
