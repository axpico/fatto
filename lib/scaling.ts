export function scaleQuantity(
  baseQuantity: number | null,
  baseServings: number,
  targetServings: number,
): number | null {
  if (baseQuantity === null) return null;
  if (baseServings <= 0) return baseQuantity;
  return (baseQuantity * targetServings) / baseServings;
}
