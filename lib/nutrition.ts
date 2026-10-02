import type { RecipeInput } from "@/lib/recipeSchema";

type NutritionKey = keyof RecipeInput["nutrition"];

export const NUTRITION_FIELDS: { key: NutritionKey; label: string; unit: string }[] = [
  { key: "caloriesKcal", label: "Calorie", unit: "kcal" },
  { key: "proteinG", label: "Proteine", unit: "g" },
  { key: "carbsG", label: "Carboidrati", unit: "g" },
  { key: "fatG", label: "Grassi", unit: "g" },
  { key: "fiberG", label: "Fibre", unit: "g" },
  { key: "sugarG", label: "Zuccheri", unit: "g" },
  { key: "saturatedFatG", label: "Grassi saturi", unit: "g" },
  { key: "sodiumMg", label: "Sodio", unit: "mg" },
];
