import { describe, it, expect } from "vitest";
import { aggregateIngredients } from "./shoppingList";

describe("aggregateIngredients", () => {
  it("sums quantities for same name+unit, case-insensitive", () => {
    const result = aggregateIngredients([
      { name: "Farina", quantity: 200, unit: "g" },
      { name: "farina", quantity: 300, unit: "g" },
    ]);
    expect(result).toEqual([{ name: "Farina", quantity: 500, unit: "g" }]);
  });

  it("merges convertible units (g/kg) into the first-seen unit", () => {
    const result = aggregateIngredients([
      { name: "Farina", quantity: 200, unit: "g" },
      { name: "Farina", quantity: 1, unit: "kg" },
    ]);
    expect(result).toEqual([{ name: "Farina", quantity: 1200, unit: "g" }]);
  });

  it("keeps incompatible/unknown units as separate rows", () => {
    const result = aggregateIngredients([
      { name: "Sale", quantity: 1, unit: "pizzico" },
      { name: "Sale", quantity: 5, unit: "g" },
    ]);
    expect(result).toHaveLength(2);
  });

  it("handles missing quantities without crashing", () => {
    const result = aggregateIngredients([
      { name: "Sale", quantity: null, unit: null },
      { name: "Sale", quantity: null, unit: null },
    ]);
    expect(result).toEqual([{ name: "Sale", quantity: null, unit: null }]);
  });

  it("sums a real quantity with a missing one instead of nulling it out", () => {
    const result = aggregateIngredients([
      { name: "Sale", quantity: null, unit: "g" },
      { name: "Sale", quantity: 10, unit: "g" },
    ]);
    expect(result).toEqual([{ name: "Sale", quantity: 10, unit: "g" }]);
  });
});
