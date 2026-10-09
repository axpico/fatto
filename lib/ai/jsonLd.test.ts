import { describe, it, expect } from "vitest";
import { extractJsonLdRecipe, parseServings } from "./jsonLd";

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

  it("falls back to GialloZafferano step markup when recipeInstructions is a plain string array", () => {
    const jsonLd = withScript({
      "@type": "Recipe",
      image: "https://x/e.jpg",
      recipeInstructions: ["Passo uno.", "Passo due."],
    });
    const html =
      jsonLd +
      `<div class="gz-content-recipe-step">
        <div class="gz-content-recipe-step-img-container">
          <picture><img src="/images/step1.jpg" /></picture>
        </div>
        <p>Passo uno.</p>
      </div>
      <div class="gz-content-recipe-step">
        <div class="gz-content-recipe-step-img-container">
          <picture><img src="/images/step2.jpg" /></picture>
        </div>
        <p>Passo due.</p>
      </div>`;
    const result = extractJsonLdRecipe(html, "https://ricette.giallozafferano.it/Ricetta.html");
    expect(result?.stepImageUrls).toEqual([
      "https://ricette.giallozafferano.it/images/step1.jpg",
      "https://ricette.giallozafferano.it/images/step2.jpg",
    ]);
  });
});

describe("parseServings", () => {
  it.each([
    ["4 porzioni", 4],
    ["Dosi per 6 persone", 6],
    [8, 8],
    [2.5, 3],
    [["6"], 6],
    [["", "4 persone"], 4],
    ["qb", null],
    [0, null],
    [null, null],
  ])("%j → %j", (input, expected) => {
    expect(parseServings(input)).toBe(expected);
  });

  it("is read from recipeYield", () => {
    const html = withScript({ "@type": "Recipe", name: "Test", recipeYield: "4 porzioni" });
    expect(extractJsonLdRecipe(html)?.servings).toBe(4);
  });
});

describe("nutrition and step parsing edge cases", () => {
  function page(recipe: object) {
    return `<script type="application/ld+json">${JSON.stringify({ "@type": "Recipe", ...recipe })}</script>`;
  }

  it("ignores a stray dot and reads Italian decimal commas", () => {
    const data = extractJsonLdRecipe(page({ nutrition: { calories: "approx. 200 kcal", fatContent: "1,5 g" } }));
    expect(data?.nutrition?.calories).toBe(200);
    expect(data?.nutrition?.fat_g).toBe(1.5);
  });

  it("does not map HowToSection groups onto steps", () => {
    const data = extractJsonLdRecipe(
      page({
        recipeInstructions: [
          { "@type": "HowToSection", name: "Impasto", image: "https://x/a.jpg", itemListElement: [] },
          { "@type": "HowToSection", name: "Farcitura", image: "https://x/b.jpg", itemListElement: [] },
        ],
      }),
    );
    expect(data?.stepImageUrls).toBeNull();
  });
});
