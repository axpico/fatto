import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { RecipeCard } from "@/components/RecipeCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/Button";
import { pillButtonClasses } from "@/components/ui/Badge";
import { SortPillLabel } from "@/components/SortPillLabel";

const SORTS = [
  { value: "recent", label: "Recenti" },
  { value: "most-cooked", label: "Più cucinate" },
  { value: "stale", label: "Da rifare" },
] as const;

type Sort = (typeof SORTS)[number]["value"];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort: rawSort } = await searchParams;
  const sort: Sort = SORTS.some((s) => s.value === rawSort) ? (rawSort as Sort) : "recent";

  const baseInclude = {
    tags: true,
    _count: { select: { cookLogs: true } },
  } as const;

  let recipes;
  if (sort === "most-cooked") {
    recipes = await prisma.recipe.findMany({
      include: baseInclude,
      orderBy: { cookLogs: { _count: "desc" } },
    });
  } else if (sort === "stale") {
    const all = await prisma.recipe.findMany({
      include: { ...baseInclude, cookLogs: { orderBy: { cookedAt: "desc" }, take: 1 } },
    });
    // mai cucinate = più "da rifare" di tutte, vengono prima
    recipes = all.sort((a, b) => {
      const aDate = a.cookLogs[0]?.cookedAt ?? null;
      const bDate = b.cookLogs[0]?.cookedAt ?? null;
      if (!aDate && !bDate) return 0;
      if (!aDate) return -1;
      if (!bDate) return 1;
      return aDate.getTime() - bDate.getTime();
    });
  } else {
    recipes = await prisma.recipe.findMany({ include: baseInclude, orderBy: { createdAt: "desc" } });
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg font-semibold text-foreground">Le tue ricette</h1>
        <Link href="/recipes/new" className={buttonClasses("primary", "sm")}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Nuova
        </Link>
      </div>

      <div className="mt-3 flex gap-2">
        {SORTS.map((s) => (
          <Link
            key={s.value}
            href={s.value === "recent" ? "/" : `/?sort=${s.value}`}
            className={pillButtonClasses(sort === s.value)}
          >
            <SortPillLabel label={s.label} />
          </Link>
        ))}
      </div>

      {recipes.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Nessuna ricetta ancora"
            description='Aggiungine una dalla tab "Importa" o crea una ricetta manualmente.'
          />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
