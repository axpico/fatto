// Stessa forma snake_case di ExtractedRecipe["nutrition"] (lib/ai/schema.ts), non un tipo
// parallelo: così il merge in app/api/import/link/route.ts è un semplice passthrough.
type JsonLdNutrition = {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  saturated_fat_g: number | null;
  sodium_mg: number | null;
};

type JsonLdRecipeData = {
  nutrition: JsonLdNutrition | null;
  servings: number | null;
  imageUrl: string | null;
  stepImageUrls: (string | null)[] | null;
};

function parseNum(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const match = value.match(/[\d.]+/);
  return match ? Number(match[0]) : null;
}

/** recipeYield: "4 porzioni", "4", 4, ["4", "4 persone"] → primo intero positivo, altrimenti null. */
export function parseServings(value: unknown): number | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const n = parseServings(item);
      if (n != null) return n;
    }
    return null;
  }
  if (typeof value === "number") return toServings(value);
  if (typeof value !== "string") return null;
  const match = value.match(/\d+/);
  return match ? toServings(Number(match[0])) : null;
}

/** Porzioni come intero positivo: arrotonda (es. 2.5 dall'AI) e scarta 0/negativi/NaN. */
export function toServings(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  return rounded > 0 ? rounded : null;
}

function parseNutrition(node: unknown): JsonLdNutrition | null {
  if (!node || typeof node !== "object") return null;
  const n = node as Record<string, unknown>;
  const result: JsonLdNutrition = {
    calories: parseNum(n.calories),
    protein_g: parseNum(n.proteinContent),
    carbs_g: parseNum(n.carbohydrateContent),
    fat_g: parseNum(n.fatContent),
    fiber_g: parseNum(n.fiberContent),
    sugar_g: parseNum(n.sugarContent),
    saturated_fat_g: parseNum(n.saturatedFatContent),
    sodium_mg: parseNum(n.sodiumContent),
  };
  return Object.values(result).some((v) => v !== null) ? result : null;
}

function parseImage(image: unknown): string | null {
  if (typeof image === "string") return image;
  if (Array.isArray(image)) return parseImage(image[0]);
  if (image && typeof image === "object") {
    const url = (image as Record<string, unknown>).url;
    if (typeof url === "string") return url;
  }
  return null;
}

// HowToSection (passaggi raggruppati sotto titoli) non è gestita — caso meno comune, ricade su
// null come il resto di questo parser best-effort
function parseStepImages(recipeInstructions: unknown): (string | null)[] | null {
  if (!Array.isArray(recipeInstructions) || recipeInstructions.length === 0) return null;
  if (recipeInstructions.some((item) => typeof item !== "object" || item === null)) return null;
  return recipeInstructions.map((item) => parseImage((item as Record<string, unknown>).image));
}

// ponytail: fallback specifico per il markup GialloZafferano (recipeInstructions è un array di
// stringhe, senza image) — un div per passaggio, stesso ordine delle stringhe JSON-LD
function parseGialloZafferanoStepImages(html: string, pageUrl: string): (string | null)[] | null {
  const marker = '<div class="gz-content-recipe-step">';
  const starts: number[] = [];
  for (let i = html.indexOf(marker); i !== -1; i = html.indexOf(marker, i + marker.length)) {
    starts.push(i);
  }
  if (starts.length === 0) return null;
  return starts.map((start, i) => {
    const block = html.slice(start, starts[i + 1] ?? html.length);
    const match = block.match(/<img[^>]*\ssrc="([^"]+)"/);
    if (!match) return null;
    try {
      return new URL(match[1], pageUrl).href;
    } catch {
      return null;
    }
  });
}

function findRecipeNode(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const types = Array.isArray(obj["@type"]) ? obj["@type"] : [obj["@type"]];
    if (types.includes("Recipe")) return obj;
    if (obj["@graph"]) return findRecipeNode(obj["@graph"]);
  }
  return null;
}

// ponytail: parser best-effort su schema.org/Recipe JSON-LD, mai un throw — i siti reali sono
// spesso incoerenti (unità, forme miste per image), meglio null che un import rotto
export function extractJsonLdRecipe(html: string, pageUrl = ""): JsonLdRecipeData | null {
  const blocks = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const [, raw] of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.trim());
    } catch {
      continue;
    }
    const recipe = findRecipeNode(parsed);
    if (recipe) {
      return {
        nutrition: parseNutrition(recipe.nutrition),
        servings: parseServings(recipe.recipeYield),
        imageUrl: parseImage(recipe.image),
        stepImageUrls:
          parseStepImages(recipe.recipeInstructions) ?? parseGialloZafferanoStepImages(html, pageUrl),
      };
    }
  }
  return null;
}
