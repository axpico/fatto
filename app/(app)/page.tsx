import Link from "next/link";
import { BookOpen, Plus, Shuffle, SlidersHorizontal, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeList } from "@/components/RecipeList";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/Button";
import { pillButtonClasses } from "@/components/ui/Badge";
import { SortPillLabel } from "@/components/SortPillLabel";
import { Reveal } from "@/components/motion/Reveal";
import { HeroSceneLoader } from "@/components/motion/HeroSceneLoader";

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

  // eslint-disable-next-line react-hooks/purity -- scelta casuale intenzionale ad ogni richiesta (server component, non un hook)
  const highlight = recipes.length > 0 ? recipes[Math.floor(Math.random() * recipes.length)] : null;

  return (
    <div className="page-shell max-w-3xl space-y-6">
      <div className="page-header rounded-xl border border-border bg-surface-secondary/70 p-5 sm:p-6">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-primary"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Il tuo ricettario</p>
          <h1 className="page-title">Le tue ricette</h1>
          <p className="page-description">{recipes.length === 0 ? "Inizia la tua raccolta con una ricetta che ami." : `${recipes.length} ${recipes.length === 1 ? "ricetta pronta" : "ricette pronte"} per il prossimo pasto.`}</p>
        </div>
        <Link href="/recipes/new" className={buttonClasses("primary", "sm")}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Nuova
        </Link>
      </div>

      {highlight && (
        <Reveal>
          <section className="relative overflow-hidden rounded-xl">
            <div className="pointer-events-none absolute inset-0 -z-10">
              <HeroSceneLoader />
            </div>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-[45%_55%_52%_48%/48%_45%_55%_52%] bg-accent text-primary"><Shuffle className="h-4 w-4" aria-hidden="true" /></span>
              <div>
                <h2 className="font-medium text-foreground">Sorpresa del giorno</h2>
                <p className="text-sm text-muted-foreground">Una ricetta a caso dalla tua raccolta.</p>
              </div>
            </div>
            <RecipeCard recipe={highlight} variant="featured" />
          </section>
        </Reveal>
      )}

      <Reveal>
        <div className="panel">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-[45%_55%_52%_48%/48%_45%_55%_52%] bg-accent text-primary"><SlidersHorizontal className="h-4 w-4" aria-hidden="true" /></span>
            <div>
              <h2 className="font-medium text-foreground">Ordina la raccolta</h2>
              <p className="text-sm text-muted-foreground">Scegli cosa vuoi ritrovare per prima.</p>
            </div>
          </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
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
        </div>
      </Reveal>

      {recipes.length === 0 ? (
          <div>
          <EmptyState
            title="Nessuna ricetta ancora"
            description='Aggiungine una dalla tab "Importa" o crea una ricetta manualmente.'
            action={<Link href="/import" className={buttonClasses("primary", "sm")}><BookOpen className="h-4 w-4" aria-hidden="true" /> Importa una ricetta</Link>}
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
