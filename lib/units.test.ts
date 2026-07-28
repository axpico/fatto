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
});
