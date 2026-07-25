"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Search, Plus, CalendarDays, ShoppingCart } from "lucide-react";

const TABS = [
  { href: "/", label: "Home", icon: House },
  { href: "/search", label: "Cerca", icon: Search },
  { href: "/import", label: "Importa", icon: Plus },
  { href: "/plan", label: "Piano", icon: CalendarDays },
  { href: "/shopping-list", label: "Spesa", icon: ShoppingCart },
] as const;

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="print:hidden fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 backdrop-blur">
      <ul className="flex justify-around">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs ${
                  active ? "text-primary" : "text-muted-foreground hover:text-primary"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
