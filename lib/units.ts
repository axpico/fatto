const ALIASES: Record<string, string> = {
  grammi: "g",
  grammo: "g",
  gr: "g",
  chilo: "kg",
  chilogrammi: "kg",
  chilogrammo: "kg",
  litro: "l",
  litri: "l",
  cucchiai: "cucchiaio",
  cucchiaini: "cucchiaino",
  tazze: "tazza",
  bicchieri: "bicchiere",
};

const MASS: Record<string, number> = { mg: 0.001, g: 1, hg: 100, kg: 1000 };
const VOLUME: Record<string, number> = {
  ml: 1,
  cl: 10,
  l: 1000,
  cucchiaino: 5,
  cucchiaio: 15,
  bicchiere: 200,
  tazza: 240,
};

function normalize(unit: string): string {
  const clean = unit.trim().toLowerCase();
  return ALIASES[clean] ?? clean;
}

function dimensionOf(unit: string): { table: Record<string, number>; factor: number } | null {
  if (unit in MASS) return { table: MASS, factor: MASS[unit] };
  if (unit in VOLUME) return { table: VOLUME, factor: VOLUME[unit] };
  return null;
}

export const CANONICAL_UNITS = [...new Set([...Object.keys(MASS), ...Object.keys(VOLUME), ...Object.keys(ALIASES)])];

// ponytail: nessuna conversione massa<->volume, dipende dalla densità dell'ingrediente
export function convert(quantity: number, fromUnit: string, toUnit: string): number | null {
  const from = dimensionOf(normalize(fromUnit));
  const to = dimensionOf(normalize(toUnit));
  if (!from || !to || from.table !== to.table) return null;
  return (quantity * from.factor) / to.factor;
}
