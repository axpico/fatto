import { describe, it, expect } from "vitest";
import { resolveUnitPreference } from "./unitPreference";

describe("resolveUnitPreference", () => {
  it("is metric only when explicitly stored as metric", () => {
    expect(resolveUnitPreference("metric")).toBe(true);
  });

  it("defaults to original units when nothing or something invalid is stored", () => {
    expect(resolveUnitPreference(null)).toBe(false);
    expect(resolveUnitPreference("bogus")).toBe(false);
  });
});
