"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { NAV_ITEMS, isNavActive } from "@/lib/navItems";
import { useMultiTap } from "@/lib/useMultiTap";

export function NavBar({ "aria-label": ariaLabel }: { "aria-label"?: string } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const multiTapHome = useMultiTap(() => router.push("/ruota"));

  return (
    <nav
      aria-label={ariaLabel}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="flex justify-around">
        {NAV_ITEMS.map((tab) => {
          const active = isNavActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-primary"
                }`}
                {...(tab.href === "/" && multiTapHome)}
              >
                <span className="relative flex h-7 w-9 items-center justify-center rounded-full">
                  {active && (
                    <motion.span
                      layoutId="mobile-nav-pill"
                      className="absolute inset-0 rounded-full bg-accent"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  {!active && (
                    <span className="absolute inset-0 rounded-full transition-colors duration-200 group-hover:bg-surface-secondary" />
                  )}
                  <Icon
                    className={`relative h-5 w-5 transition-transform duration-200 ${active ? "scale-110" : ""}`}
                    strokeWidth={active ? 2.25 : 1.75}
                    aria-hidden="true"
                  />
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
