import { House, Search, Plus, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Ricette", icon: House },
  { href: "/search", label: "Cerca", icon: Search },
  { href: "/import", label: "Importa", icon: Plus },
  { href: "/settings", label: "Impostazioni", icon: Settings },
] as const;
