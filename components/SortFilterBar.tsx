"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Star } from "lucide-react";
import { pillButtonClasses } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { SortPillLabel } from "@/components/SortPillLabel";

type SortOption = { value: string; label: string; href: string };

export function SortFilterBar({
  sorts,
  activeSort,
  favoriteHref,
  favoritesOnly,
}: {
  sorts: SortOption[];
  activeSort: string;
  favoriteHref: string;
  favoritesOnly: boolean;
}) {
  const router = useRouter();

  return (
    <>
      {/* mobile: native select (bigger tap target, no cramped horizontal scroll) + favorite toggle */}
      <div className="flex gap-2 sm:hidden">
        <Select
          aria-label="Ordina per"
          value={activeSort}
          onChange={(e) => router.push(sorts.find((s) => s.value === e.target.value)?.href ?? "/")}
          className="min-h-9 py-1.5 text-sm"
        >
          {sorts.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Link
          href={favoriteHref}
          aria-pressed={favoritesOnly}
          className={`${pillButtonClasses(favoritesOnly)} shrink-0 whitespace-nowrap`}
        >
          <Star className="h-3.5 w-3.5" aria-hidden="true" /> Preferiti
        </Link>
      </div>

      {/* tablet/desktop: pill row */}
      <div className="hidden gap-2 overflow-x-auto pb-1 sm:flex">
        {sorts.map((s) => (
          <Link
            key={s.value}
            href={s.href}
            aria-current={activeSort === s.value ? "true" : undefined}
            className={pillButtonClasses(activeSort === s.value)}
          >
            <SortPillLabel label={s.label} />
          </Link>
        ))}
        <Link href={favoriteHref} aria-pressed={favoritesOnly} className={pillButtonClasses(favoritesOnly)}>
          <Star className="h-3.5 w-3.5" aria-hidden="true" /> <SortPillLabel label="Preferiti" />
        </Link>
      </div>
    </>
  );
}
