export const THEME_STORAGE_KEY = "fatto-theme";

// Resolves to data-theme unconditionally (stored choice, else OS preference) so globals.css only
// needs one dark ruleset ([data-theme="dark"]) instead of duplicating it under a prefers-color-scheme
// media query too. Exported (not inlined in layout.tsx) so next.config.ts can hash this exact string
// for the script-src CSP directive instead of falling back to 'unsafe-inline'.
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark")t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t;}catch(e){}})();`;

export type Theme = "light" | "dark";

export function resolveTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === "light" || stored === "dark") return stored;
  return prefersDark ? "dark" : "light";
}
