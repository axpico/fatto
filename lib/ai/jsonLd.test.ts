import { describe, it, expect } from "vitest";
import { extractJsonLdRecipe } from "./jsonLd";

function withScript(json: unknown): string {
  return `<html><head><script type="application/ld+json">${JSON.stringify(json)}</script></head></html>`;
}

const NUTRITION = {
  "@type": "NutritionInformation",
  calories: "250 kcal",
  proteinContent: "12 g",
  carbohydrateContent: "30g",
  fatContent: "8 g",
  fiberContent: "3 g",
  sugarContent: "5 g",
  saturatedFatContent: "2 g",
  sodiumContent: "400 mg",
};

describe("extractJsonLdRecipe", () => {
  it("parses a bare Recipe object", () => {
    const html = withScript({ "@type": "Recipe", name: "Test", nutrition: NUTRITION, image: "https://x/a.jpg" });
    const result = extractJsonLdRecipe(html);
    expect(result?.imageUrl).toBe("https://x/a.jpg");
    expect(result?.nutrition?.calories).toBe(250);
    expect(result?.nutrition?.protein_g).toBe(12);
    expect(result?.nutrition?.sodium_mg).toBe(400);
  });

  it("finds a Recipe inside an array of JSON-LD objects", () => {
    const html = withScript([
      { "@type": "WebSite", name: "Site" },
      { "@type": "Recipe", name: "Test", nutrition: NUTRITION, image: [] },
    ]);
    expect(extractJsonLdRecipe(html)?.nutrition?.carbs_g).toBe(30);
  });

  it("finds a Recipe inside an @graph wrapper", () => {
    const html = withScript({
      "@graph": [{ "@type": "BreadcrumbList" }, { "@type": ["Recipe"], nutrition: NUTRITION, image: "https://x/b.jpg" }],
    });
    const result = extractJsonLdRecipe(html);
    expect(result?.imageUrl).toBe("https://x/b.jpg");
    expect(result?.nutrition?.fat_g).toBe(8);
  });

  it("handles image as an array of ImageObject", () => {
    const html = withScript({
      "@type": "Recipe",
      image: [{ "@type": "ImageObject", url: "https://x/c.jpg" }],
    });
    expect(extractJsonLdRecipe(html)?.imageUrl).toBe("https://x/c.jpg");
  });

  it("skips a malformed block and finds a valid one", () => {
    const html =
      `<script type="application/ld+json">{not valid json</script>` +
      withScript({ "@type": "Recipe", image: "https://x/d.jpg" });
    expect(extractJsonLdRecipe(html)?.imageUrl).toBe("https://x/d.jpg");
  });

  it("returns null when no Recipe type is present anywhere", () => {
    const html = withScript({ "@type": "WebSite", name: "Site" });
    expect(extractJsonLdRecipe(html)).toBeNull();
  });

  it("returns null when there is no JSON-LD at all", () => {
    expect(extractJsonLdRecipe("<html><body>hello</body></html>")).toBeNull();
  });
});
