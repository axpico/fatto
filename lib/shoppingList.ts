import { convert } from "./units";

export type ShoppingIngredientRow = { name: string; quantity: number | null; unit: string | null };

function unitsCompatible(a: string | null, b: string | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return convert(1, b, a) !== null;
}

export function aggregateIngredients(rows: ShoppingIngredientRow[]): ShoppingIngredientRow[] {
  const byName = new Map<string, ShoppingIngredientRow[]>();

  for (const row of rows) {
    const name = row.name.trim();
    const unit = row.unit?.trim() || null;
    const key = name.toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push({ name, quantity: row.quantity, unit });
  }

  const result: ShoppingIngredientRow[] = [];
  for (const group of byName.values()) {
    const merged: ShoppingIngredientRow[] = [];
    for (const row of group) {
      const target = merged.find((m) => unitsCompatible(m.unit, row.unit));
      if (!target) {
        merged.push({ ...row });
        continue;
      }
      if (row.quantity !== null) {
        const converted =
          target.unit && row.unit && target.unit !== row.unit
            ? (convert(row.quantity, row.unit, target.unit) ?? row.quantity)
            : row.quantity;
        target.quantity = (target.quantity ?? 0) + converted;
      }
    }
    result.push(...merged);
  }

  return result;
}
