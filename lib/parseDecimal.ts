/** "0,5" / "0.5" / " 2 " → number; empty or non-numeric → null. Italian keyboards type a comma. */
export function parseDecimal(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}
