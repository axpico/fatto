import { describe, it, expect } from "vitest";
import { convert, applyUnitPreference } from "./units";

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

  it("converts English kitchen units", () => {
    expect(convert(1, "cup", "ml")).toBe(240);
    expect(convert(3, "tsp", "tbsp")).toBe(1);
    expect(convert(1, "lb", "oz")).toBe(16);
    expect(convert(1, "gallon", "cup")).toBe(16);
    expect(convert(2, "tablespoons", "ml")).toBe(30);
    expect(convert(1, "cup", "oz")).toBeNull();
  });

  it("tolerates a single typo via fuzzy unit matching", () => {
    expect(convert(1, "cucchiao", "ml")).toBe(15); // missing "i" (cucchiaio)
    expect(convert(1, "teaspon", "ml")).toBe(5); // missing "o" (teaspoon -> tsp)
    expect(convert(1, "kgg", "g")).toBe(1000); // extra "g" (kg)
  });

  it("does not guess when a typo is ambiguous between two different units", () => {
    // "tbs" is a single edit away from both "lbs" (-> lb, mass) and "tbsp" (-> tbsp, volume)
    expect(convert(1, "tbs", "ml")).toBeNull();
  });

  it("does not fuzzy-match unrelated units or multi-typo strings", () => {
    expect(convert(1, "xyzabc", "g")).toBeNull();
    expect(convert(1, "pizzico", "g")).toBeNull(); // far from any known unit, stays unconvertible
  });
});

describe("applyUnitPreference", () => {
  it("converts mass and volume units to g/ml when enabled", () => {
    expect(applyUnitPreference(2, "tsp", true)).toEqual({ quantity: 10, unit: "ml" });
    expect(applyUnitPreference(1, "kg", true)).toEqual({ quantity: 1000, unit: "g" });
  });

  it("leaves the quantity untouched when disabled, unitless, or unconvertible", () => {
    expect(applyUnitPreference(1, "cup", false)).toEqual({ quantity: 1, unit: "cup" });
    expect(applyUnitPreference(3, null, true)).toEqual({ quantity: 3, unit: null });
    expect(applyUnitPreference(2, "pizzico", true)).toEqual({ quantity: 2, unit: "pizzico" });
  });

  it("uses ingredient density to convert volume units of known solids to grams", () => {
    expect(applyUnitPreference(0.5, "cup", true, "cioccolato, tritato")).toEqual({
      quantity: 76.8,
      unit: "g",
    });
    expect(applyUnitPreference(1, "cucchiaio", true, "farina 00")).toEqual({
      quantity: 7.95,
      unit: "g",
    });
  });

  it("ignores density for unmatched ingredients or non-volume units", () => {
    expect(applyUnitPreference(1, "cup", true, "limoncello")).toEqual({ quantity: 240, unit: "ml" });
    expect(applyUnitPreference(1, "kg", true, "farina 00")).toEqual({ quantity: 1000, unit: "g" });
  });

  it("matches the longest/most specific density key, not the first substring hit", () => {
    // "farina di riso" contains both "farina" (0.53) and "riso" (0.75); "farina" is longer so it wins
    expect(applyUnitPreference(1, "cucchiaio", true, "farina di riso")).toEqual({
      quantity: 7.95,
      unit: "g",
    });
  });

  it("rounds converted quantities to 2 decimals", () => {
    expect(applyUnitPreference(1, "cucchiaino", true, "miele")).toEqual({ quantity: 7.1, unit: "g" });
  });

  it("matches density on whole words only, not inside unrelated compound words", () => {
    // "risotto" contains "riso" as a substring but not as a whole word - should not match
    expect(applyUnitPreference(1, "cup", true, "risotto")).toEqual({ quantity: 240, unit: "ml" });
    expect(applyUnitPreference(1, "cup", true, "riso")).toEqual({ quantity: 180, unit: "g" });
  });

  it("converts the newly added density entries", () => {
    expect(applyUnitPreference(1, "cucchiaio", true, "olio")).toEqual({ quantity: 13.8, unit: "g" });
    expect(applyUnitPreference(2, "cucchiai", true, "parmigiano grattugiato")).toEqual({
      quantity: 12,
      unit: "g",
    });
  });
});

describe("aliases added for Italian/English spellings", () => {
  it("handles decilitres, millilitri and English gram/kilogram", () => {
    expect(convert(2, "dl", "ml")).toBe(200);
    expect(convert(1, "decilitri", "ml")).toBe(100);
    expect(convert(250, "millilitri", "l")).toBe(0.25);
    expect(convert(500, "grams", "kg")).toBe(0.5);
    expect(convert(1, "kilogram", "g")).toBe(1000);
  });
});
