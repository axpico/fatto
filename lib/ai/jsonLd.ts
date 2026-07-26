// Stessa forma snake_case di ExtractedRecipe["nutrition"] (lib/ai/schema.ts), non un tipo
// parallelo: così il merge in app/api/import/link/route.ts è un semplice passthrough.
export type JsonLdNutrition = {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  saturated_fat_g: number | null;
  sodium_mg: number | null;
};

export type JsonLdRecipeData = {
  nutrition: JsonLdNutrition | null;
  imageUrl: string | null;
};

function parseNum(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const match = value.match(/[\d.]+/);
  return match ? Number(match[0]) : null;
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
export function extractJsonLdRecipe(html: string): JsonLdRecipeData | null {
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
      return { nutrition: parseNutrition(recipe.nutrition), imageUrl: parseImage(recipe.image) };
    }
  }
  return null;
}
