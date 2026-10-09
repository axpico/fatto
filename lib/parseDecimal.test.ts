import { describe, expect, it } from "vitest";
import { parseDecimal } from "./parseDecimal";

describe("parseDecimal", () => {
  it.each([
    ["0,5", 0.5],
    ["0.5", 0.5],
    [" 2 ", 2],
    ["1,", 1],
    ["", null],
    ["abc", null],
    ["1,2,3", null],
  ])("%j → %j", (raw, expected) => {
    expect(parseDecimal(raw)).toBe(expected);
  });
});
