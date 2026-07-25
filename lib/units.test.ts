import { describe, it, expect } from "vitest";
import { convert } from "./units";

describe("convert", () => {
  it("converts within mass", () => {
    expect(convert(1, "kg", "g")).toBe(1000);
    expect(convert(500, "g", "kg")).toBe(0.5);
  });

  it("converts within volume, including kitchen units", () => {
    expect(convert(1, "cucchiaio", "ml")).toBe(15);
    expect(convert(1, "tazza", "ml")).toBe(240);
    expect(convert(240, "ml", "tazza")).toBe(1);
  });

  it("normalizes common aliases before converting", () => {
    expect(convert(1, "chilo", "grammi")).toBe(1000);
    expect(convert(2, "cucchiaini", "ml")).toBe(10);
  });

  it("returns null across incompatible dimensions", () => {
    expect(convert(1, "kg", "l")).toBeNull();
  });

  it("returns null for unknown units", () => {
    expect(convert(1, "pizzico", "g")).toBeNull();
    expect(convert(1, "g", "q.b.")).toBeNull();
  });
});
