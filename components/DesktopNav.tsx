"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { NAV_ITEMS, isNavActive } from "@/lib/navItems";
import { useMultiTap } from "@/lib/useMultiTap";

export function DesktopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const multiTapHome = useMultiTap(() => router.push("/ruota"));

  return (
    <nav aria-label="Navigazione desktop" className="hidden items-center gap-1 md:flex">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isNavActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm transition-colors ${
              active ? "text-primary" : "text-muted-foreground hover:bg-surface-secondary hover:text-foreground"
            }`}
            {...(href === "/" && multiTapHome)}
          >
            {active && (
              <motion.span
                layoutId="desktop-nav-pill"
                className="absolute inset-0 rounded-md bg-accent"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <Icon className="relative h-4 w-4" aria-hidden="true" />
            <span className="relative">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
