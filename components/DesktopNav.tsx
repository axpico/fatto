"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavActive } from "@/lib/navItems";

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigazione desktop" className="hidden items-center gap-1 md:flex">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isNavActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm transition-colors ${
              active ? "bg-accent text-primary" : "text-muted-foreground hover:bg-surface-secondary hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
