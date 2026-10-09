const ALIASES: Record<string, string> = {
  grammi: "g",
  grammo: "g",
  gr: "g",
  chilo: "kg",
  chilogrammi: "kg",
  chilogrammo: "kg",
  litro: "l",
  litri: "l",
  decilitro: "dl",
  decilitri: "dl",
  millilitro: "ml",
  millilitri: "ml",
  gram: "g",
  grams: "g",
  kilogram: "kg",
  kilograms: "kg",
  cucchiai: "cucchiaio",
  cucchiaini: "cucchiaino",
  tazze: "tazza",
  bicchieri: "bicchiere",
  teaspoon: "tsp",
  teaspoons: "tsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  cups: "cup",
  ounce: "oz",
  ounces: "oz",
  pound: "lb",
  pounds: "lb",
  lbs: "lb",
  pint: "pt",
  pints: "pt",
  quart: "qt",
  quarts: "qt",
  gallon: "gal",
  gallons: "gal",
  "fluid ounce": "fl oz",
  "fluid ounces": "fl oz",
  floz: "fl oz",
};

const MASS: Record<string, number> = { mg: 0.001, g: 1, hg: 100, kg: 1000, oz: 28.35, lb: 453.6 };
const VOLUME: Record<string, number> = {
  ml: 1,
  cl: 10,
  dl: 100,
  l: 1000,
  cucchiaino: 5,
  cucchiaio: 15,
  bicchiere: 200,
  tazza: 240,
  tsp: 5,
  tbsp: 15,
  cup: 240,
  "fl oz": 30,
  pt: 480,
  qt: 960,
  gal: 3840,
};

const KNOWN_UNITS = [...new Set([...Object.keys(ALIASES), ...Object.keys(MASS), ...Object.keys(VOLUME)])];

// classic O(n*m) edit distance, fine for short unit strings
function editDistance(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// single typo/transposition only (distance 1), and only among known units. If distance-1 candidates
// resolve to different canonical units (e.g. "tbs" is 1 away from both "lbs" and "tbsp"), it's
// genuinely ambiguous - better to not convert than to silently guess wrong.
function fuzzyMatchUnit(clean: string): string | null {
  const resolved = new Set(
    KNOWN_UNITS.filter((u) => editDistance(clean, u) === 1).map((u) => ALIASES[u] ?? u),
  );
  return resolved.size === 1 ? [...resolved][0] : null;
}

function normalize(unit: string): string {
  const clean = unit.trim().toLowerCase();
  if (clean in ALIASES) return ALIASES[clean];
  if (clean in MASS || clean in VOLUME) return clean;
  return fuzzyMatchUnit(clean) ?? clean;
}

function dimensionOf(unit: string): { table: Record<string, number>; factor: number } | null {
  if (unit in MASS) return { table: MASS, factor: MASS[unit] };
  if (unit in VOLUME) return { table: VOLUME, factor: VOLUME[unit] };
  return null;
}

// g per ml, for ingredients typically measured by volume (cup/tbsp/tsp) but better shown in grams.
// ponytail: substring match over a handful of common baking ingredients, not a full food-density db.
// Upgrade path: per-recipe density override, or a real ingredient density table if mismatches show up.
const DENSITY_BY_INGREDIENT: Record<string, number> = {
  farina: 0.53,
  zucchero: 0.85,
  burro: 0.96,
  cioccolato: 0.64,
  cacao: 0.5,
  riso: 0.75,
  sale: 1.2,
  miele: 1.42,
  latte: 1.03,
  panna: 1.0,
  olio: 0.92,
  acqua: 1.0,
  parmigiano: 0.4,
  mandorle: 0.5,
  mandorla: 0.5,
  noci: 0.45,
  pangrattato: 0.4,
  lievito: 0.8,
};

// sorted longest-first so a more specific key (e.g. "riso") wins over a shorter unrelated one
const DENSITY_KEYS = Object.keys(DENSITY_BY_INGREDIENT).sort((a, b) => b.length - a.length);
// word-boundary match so e.g. "sale" doesn't match inside an unrelated compound word
const DENSITY_MATCHERS = DENSITY_KEYS.map((key) => ({ key, re: new RegExp(`\\b${key}\\b`) }));

function densityFor(ingredientName: string): number | null {
  const name = ingredientName.toLowerCase();
  const match = DENSITY_MATCHERS.find(({ re }) => re.test(name));
  return match ? DENSITY_BY_INGREDIENT[match.key] : null;
}

export const CANONICAL_UNITS = [...new Set([...Object.keys(MASS), ...Object.keys(VOLUME), ...Object.keys(ALIASES)])];

// ponytail: nessuna conversione massa<->volume, dipende dalla densità dell'ingrediente
export function convert(quantity: number, fromUnit: string, toUnit: string): number | null {
  const from = dimensionOf(normalize(fromUnit));
  const to = dimensionOf(normalize(toUnit));
  if (!from || !to || from.table !== to.table) return null;
  return (quantity * from.factor) / to.factor;
}

function roundQuantity(n: number): number {
  return Math.round(n * 100) / 100;
}

export function applyUnitPreference(
  quantity: number,
  unit: string | null,
  useMetric: boolean,
  ingredientName?: string,
): { quantity: number; unit: string | null } {
  if (!useMetric || !unit) return { quantity, unit };
  if (ingredientName) {
    const density = densityFor(ingredientName);
    if (density !== null) {
      const ml = convert(quantity, unit, "ml");
      if (ml !== null) return { quantity: roundQuantity(ml * density), unit: "g" };
    }
  }
  const grams = convert(quantity, unit, "g");
  if (grams !== null) return { quantity: roundQuantity(grams), unit: "g" };
  const ml = convert(quantity, unit, "ml");
  if (ml !== null) return { quantity: roundQuantity(ml), unit: "ml" };
  return { quantity, unit };
}
