import { House, Search, Plus, Shuffle, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Ricette", icon: House },
  { href: "/search", label: "Cerca", icon: Search },
  { href: "/decidi", label: "Decidi", icon: Shuffle },
  { href: "/import", label: "Importa", icon: Plus },
  { href: "/settings", label: "Impostazioni", icon: Settings },
] as const;

/** "/" è attiva solo su match esatto, le altre voci anche sulle loro sottopagine. */
export function isNavActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
