export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
}

const rtf = new Intl.RelativeTimeFormat("it-IT", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

export function formatRelativeDate(iso: string): string {
  const diffSeconds = (new Date(iso).getTime() - Date.now()) / 1000;
  for (const [unit, secondsInUnit] of UNITS) {
    if (Math.abs(diffSeconds) >= secondsInUnit) return rtf.format(Math.round(diffSeconds / secondsInUnit), unit);
  }
  return rtf.format(Math.round(diffSeconds), "second");
}
