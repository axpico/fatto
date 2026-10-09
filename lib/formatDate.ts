// ponytail: fixed to Italy (the app's only audience). Without it the server (UTC in Docker)
// renders a cook logged at 00:30 Italian time on the previous day.
const DISPLAY_TIME_ZONE = "Europe/Rome";

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: DISPLAY_TIME_ZONE,
  });
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

// trunc, not round: 45 days is "1 mese fa", not "2 mesi fa"; 23.6 hours stays "23 ore fa"
export function formatRelativeDate(iso: string, now = Date.now()): string {
  const diffSeconds = (new Date(iso).getTime() - now) / 1000;
  for (const [unit, secondsInUnit] of UNITS) {
    if (Math.abs(diffSeconds) >= secondsInUnit) return rtf.format(Math.trunc(diffSeconds / secondsInUnit), unit);
  }
  return rtf.format(Math.trunc(diffSeconds), "second");
}
