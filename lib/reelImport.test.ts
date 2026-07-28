import { describe, it, expect } from "vitest";
import { resolveStepImages } from "./reelImport";
import type { ExtractedRecipe } from "@/lib/ai/schema";

function step(instruction: string, image_index: number | null): ExtractedRecipe["steps"][number] {
  return { instruction, timer_minutes: null, optional: false, image_index };
}

describe("resolveStepImages", () => {
  const gallery = ["frame-0.jpg", "frame-1.jpg", "frame-2.jpg"];

  it("resolves a valid index to its gallery filename", () => {
    const [result] = resolveStepImages([step("Mescola", 1)], gallery);
    expect(result.image_filename).toBe("frame-1.jpg");
  });

  it("leaves image_filename null when image_index is null", () => {
    const [result] = resolveStepImages([step("Servi", null)], gallery);
    expect(result.image_filename).toBeNull();
  });

  it("falls back to null for an out-of-range index", () => {
    const [result] = resolveStepImages([step("Cuoci", 99)], gallery);
    expect(result.image_filename).toBeNull();
  });

  it("lets two steps share the same index", () => {
    const [first, second] = resolveStepImages([step("Prepara", 0), step("Impiatta", 0)], gallery);
    expect(first.image_filename).toBe("frame-0.jpg");
    expect(second.image_filename).toBe("frame-0.jpg");
  });

  it("returns null for every step when there's no gallery", () => {
    const [result] = resolveStepImages([step("Taglia", 0)], []);
    expect(result.image_filename).toBeNull();
  });
});
