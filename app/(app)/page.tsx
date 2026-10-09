import Link from "next/link";
import { BookOpen, Plus, Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeList } from "@/components/RecipeList";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SortFilterBar } from "@/components/SortFilterBar";
import { computeCookStats, compareBySort, parseRecipeSort, RECIPE_SORTS, type RecipeSort } from "@/lib/recipeStats";
import type { Prisma } from "@/lib/generated/prisma/client";

function homeHref(sort: RecipeSort, favoritesOnly: boolean) {
  const params = new URLSearchParams();
  if (sort !== "recent") params.set("sort", sort);
  if (favoritesOnly) params.set("favorites", "1");
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; favorites?: string }>;
}) {
  const user = await requireUser();
  const { sort: rawSort, favorites: rawFavorites } = await searchParams;
  const sort = parseRecipeSort(rawSort);
  const favoritesOnly = rawFavorites === "1";

  const favWhere: Prisma.RecipeWhereInput | undefined = favoritesOnly
    ? { favorites: { some: { userId: user.id } } }
    : undefined;

  const raw = await prisma.recipe.findMany({
    where: favWhere,
    include: {
      tags: true,
      favorites: { where: { userId: user.id }, select: { id: true } },
      cookLogs: { select: { rating: true, cookedAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const withStats = raw.map((r) => ({ ...r, favorite: r.favorites.length > 0, ...computeCookStats(r.cookLogs) }));
  const sorted = sort === "recent" ? withStats : [...withStats].sort((a, b) => compareBySort(sort, a, b));
  const recipes = sorted.map((r) => ({ ...r, lastCookedAt: r.lastCookedAt?.toISOString() ?? null }));

  // stabile per tutto il giorno (stesso seed finché la data non cambia), non ad ogni richiesta
  const today = new Date().toISOString().slice(0, 10);
  let seed = 0;
  for (let i = 0; i < today.length; i++) seed = (seed * 31 + today.charCodeAt(i)) >>> 0;
  const highlight = recipes.length > 0 ? recipes[seed % recipes.length] : null;

  return (
    <div className="page-shell space-y-8">
      <div className="space-y-4">
        <div className="page-header">
          <h1 className="page-title">Le tue ricette</h1>
          <Link href="/recipes/new" className={buttonClasses("primary", "sm")}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Nuova
          </Link>
        </div>

        {/* plain GET form: lands on /search?q=..., where the full filters live */}
        <form action="/search" role="search" className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            name="q"
            enterKeyHint="search"
            placeholder="Cerca una ricetta"
            aria-label="Cerca una ricetta"
            className="pl-10"
          />
        </form>
      </div>

      {highlight && (
        <section className="space-y-3">
          <h2 className="section-title">Sorpresa del giorno</h2>
          <RecipeCard recipe={highlight} variant="featured" />
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="section-title">La tua raccolta</h2>
          <span className="text-sm text-muted-foreground">
            {recipes.length} {recipes.length === 1 ? "ricetta" : "ricette"}
          </span>
        </div>
        {(recipes.length > 0 || favoritesOnly) && (
          <SortFilterBar
            sorts={RECIPE_SORTS.map((s) => ({ value: s.value, label: s.label, href: homeHref(s.value, favoritesOnly) }))}
            activeSort={sort}
            favoriteHref={homeHref(sort, !favoritesOnly)}
            favoritesOnly={favoritesOnly}
          />
        )}
        {recipes.length === 0 ? (
          <EmptyState
            title={favoritesOnly ? "Nessuna ricetta preferita" : "Nessuna ricetta ancora"}
            description={
              favoritesOnly
                ? "Tocca la stella su una ricetta per aggiungerla qui."
                : 'Aggiungine una dalla tab "Importa" o crea una ricetta manualmente.'
            }
            action={
              favoritesOnly ? (
                <Link href={homeHref(sort, false)} className={buttonClasses("secondary", "sm")}>
                  Mostra tutte le ricette
                </Link>
              ) : (
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href="/import" className={buttonClasses("primary", "sm")}><BookOpen className="h-4 w-4" aria-hidden="true" /> Importa una ricetta</Link>
                  <Link href="/recipes/new" className={buttonClasses("secondary", "sm")}><Plus className="h-4 w-4" aria-hidden="true" /> Crea manualmente</Link>
                </div>
              )
            }
          />
        ) : (
          <RecipeList recipes={recipes} />
        )}
      </section>
    </div>
  );
}
