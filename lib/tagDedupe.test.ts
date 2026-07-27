import { describe, it, expect } from "vitest";
import { pickBestMatch } from "./tagDedupe";

describe("pickBestMatch", () => {
  it("returns the top candidate when it meets the threshold", () => {
    expect(pickBestMatch([{ name: "dolce", sim: 0.8 }], 0.6)).toBe("dolce");
  });

  it("returns null when the top candidate is below the threshold", () => {
    expect(pickBestMatch([{ name: "dolce", sim: 0.4 }], 0.6)).toBeNull();
  });

  it("returns null for no candidates", () => {
    expect(pickBestMatch([], 0.6)).toBeNull();
  });
});
