import Link from "next/link";
import { BookOpen, Plus, Shuffle, SlidersHorizontal, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeList } from "@/components/RecipeList";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/Button";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { SortFilterBar } from "@/components/SortFilterBar";
import { Reveal } from "@/components/motion/Reveal";
import type { Prisma } from "@/lib/generated/prisma/client";

const SORTS = [
  { value: "recent", label: "Recenti" },
  { value: "most-cooked", label: "Più cucinate" },
  { value: "top-rated", label: "Meglio valutate" },
  { value: "stale", label: "Da rifare" },
] as const;

type Sort = (typeof SORTS)[number]["value"];

function homeHref(sort: Sort, favoritesOnly: boolean) {
  const params = new URLSearchParams();
  if (sort !== "recent") params.set("sort", sort);
  if (favoritesOnly) params.set("favorite", "1");
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; favorite?: string }>;
}) {
  const user = await requireUser();
  const { sort: rawSort, favorite: rawFavorite } = await searchParams;
  const sort: Sort = SORTS.some((s) => s.value === rawSort) ? (rawSort as Sort) : "recent";
  const favoritesOnly = rawFavorite === "1";

  const baseInclude = {
    tags: true,
    _count: { select: { cookLogs: true } },
    favorites: { where: { userId: user.id }, select: { id: true } },
  } as const;
  const favWhere: Prisma.RecipeWhereInput | undefined = favoritesOnly
    ? { favorites: { some: { userId: user.id } } }
    : undefined;

  let recipes;
  if (sort === "most-cooked") {
    recipes = await prisma.recipe.findMany({
      where: favWhere,
      include: baseInclude,
      orderBy: { cookLogs: { _count: "desc" } },
    });
  } else if (sort === "top-rated") {
    const all = await prisma.recipe.findMany({
      where: favWhere,
      include: { ...baseInclude, cookLogs: { where: { rating: { not: null } }, select: { rating: true } } },
    });
    // niente voti = in fondo, non a pari merito con un 0
    const avgRating = (r: (typeof all)[number]) =>
      r.cookLogs.length > 0 ? r.cookLogs.reduce((sum, l) => sum + l.rating!, 0) / r.cookLogs.length : null;
    recipes = all.sort((a, b) => {
      const [aAvg, bAvg] = [avgRating(a), avgRating(b)];
      if (aAvg === null) return bAvg === null ? 0 : 1;
      if (bAvg === null) return -1;
      return bAvg - aAvg;
    });
  } else if (sort === "stale") {
    const all = await prisma.recipe.findMany({
      where: favWhere,
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
    recipes = await prisma.recipe.findMany({ where: favWhere, include: baseInclude, orderBy: { createdAt: "desc" } });
  }

  recipes = recipes.map((r) => ({ ...r, favorite: r.favorites.length > 0 }));

  // stabile per tutto il giorno (stesso seed finché la data non cambia), non ad ogni richiesta
  const today = new Date().toISOString().slice(0, 10);
  let seed = 0;
  for (let i = 0; i < today.length; i++) seed = (seed * 31 + today.charCodeAt(i)) >>> 0;
  const highlight = recipes.length > 0 ? recipes[seed % recipes.length] : null;

  return (
    <div className="page-shell max-w-3xl space-y-6">
      <div className="page-header rounded-xl border border-border bg-surface-secondary/70 p-5 sm:p-6">
        <div>
          <p className="eyebrow mb-2"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Il tuo ricettario</p>
          <h1 className="page-title">Le tue ricette</h1>
          <p className="page-description">{recipes.length === 0 ? "Inizia la tua raccolta con una ricetta che ami." : `${recipes.length} ${recipes.length === 1 ? "ricetta pronta" : "ricette pronte"} per il prossimo pasto.`}</p>
        </div>
        <Link href="/recipes/new" className={buttonClasses("primary", "sm")}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Nuova
        </Link>
      </div>

      {highlight && (
        <Reveal>
          <section>
            <SectionIntro icon={Shuffle} title="Sorpresa del giorno" description="Una ricetta a caso dalla tua raccolta." />
            <RecipeCard recipe={highlight} variant="featured" />
          </section>
        </Reveal>
      )}

      <Reveal>
        <div className="panel">
          <SectionIntro icon={SlidersHorizontal} title="Ordina la raccolta" description="Scegli cosa vuoi ritrovare per prima." />
          <SortFilterBar
            sorts={SORTS.map((s) => ({ value: s.value, label: s.label, href: homeHref(s.value, favoritesOnly) }))}
            activeSort={sort}
            favoriteHref={homeHref(sort, !favoritesOnly)}
            favoritesOnly={favoritesOnly}
          />
        </div>
      </Reveal>

      {recipes.length === 0 ? (
          <div>
          <EmptyState
            title={favoritesOnly ? "Nessuna ricetta preferita" : "Nessuna ricetta ancora"}
            description={
              favoritesOnly
                ? "Tocca la stella su una ricetta per aggiungerla qui."
                : 'Aggiungine una dalla tab "Importa" o crea una ricetta manualmente.'
            }
            action={
              favoritesOnly ? undefined : (
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href="/import" className={buttonClasses("primary", "sm")}><BookOpen className="h-4 w-4" aria-hidden="true" /> Importa una ricetta</Link>
                  <Link href="/recipes/new" className={buttonClasses("secondary", "sm")}><Plus className="h-4 w-4" aria-hidden="true" /> Crea manualmente</Link>
                </div>
              )
            }
          />
        </div>
      ) : (
        <Reveal>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-foreground">La tua raccolta</h2>
              <span className="text-sm text-muted-foreground">{recipes.length} {recipes.length === 1 ? "ricetta" : "ricette"}</span>
            </div>
          <RecipeList recipes={recipes} />
          </section>
        </Reveal>
      )}
    </div>
  );
}
