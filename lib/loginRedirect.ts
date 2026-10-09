/** Only same-origin relative paths: blocks open redirects like `//evil.com` or `/\evil.com`. */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  if (raw === "/login" || raw.startsWith("/login?")) return "/";
  return raw;
}

export function loginHref(path: string | null | undefined): string {
  const next = safeNextPath(path);
  return next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;
}
