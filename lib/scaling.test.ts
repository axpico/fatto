import { describe, it, expect } from "vitest";
import { scaleQuantity } from "./scaling";

describe("scaleQuantity", () => {
  it("scales linearly", () => {
    expect(scaleQuantity(100, 4, 8)).toBe(200);
    expect(scaleQuantity(100, 4, 2)).toBe(50);
  });

  it("passes through null quantities", () => {
    expect(scaleQuantity(null, 4, 8)).toBeNull();
  });

  it("guards against zero/negative base servings", () => {
    expect(scaleQuantity(100, 0, 8)).toBe(100);
    expect(scaleQuantity(100, -1, 8)).toBe(100);
  });
});
