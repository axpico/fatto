import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChefHat, Printer, Pencil, Clock, ExternalLink, Star, Video } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ServingsAdjuster } from "@/components/ServingsAdjuster";
import { DeleteRecipeButton } from "@/components/DeleteRecipeButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { CookLogSection } from "@/components/CookLogSection";
import { StepImageThumb } from "@/components/StepImageThumb";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { formatDate, formatRelativeDate } from "@/lib/formatDate";
import { Reveal } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";
import { RecipePhotoCarousel } from "@/components/RecipePhotoCarousel";
import { NUTRITION_FIELDS as BASE_NUTRITION_FIELDS } from "@/lib/nutrition";
import { orderedIngredientsAndSteps } from "@/lib/recipeInclude";
import { computeCookStats } from "@/lib/recipeStats";

// ponytail: 60s di margine assorbe lo scarto tra createdAt (orologio DB) e updatedAt
// (orologio Prisma) su una riga appena creata; una modifica vera arriva quasi sempre dopo
const EDIT_THRESHOLD_MS = 60_000;

// stessi campi/ordine di lib/nutrition.ts: unità con spazio iniziale (qui {value}{unit} si
// scrivono senza spazio in JSX) e "di cui saturi" al posto di "Grassi saturi", perché qui il
// grasso saturo segue subito il grasso totale nella stessa lista invece che nel form dedicato
const NUTRITION_FIELDS = BASE_NUTRITION_FIELDS.map((field) => ({
  ...field,
  label: field.key === "saturatedFatG" ? "di cui saturi" : field.label,
  unit: ` ${field.unit}`,
}));

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      ...orderedIngredientsAndSteps,
      tags: true,
      cookLogs: { orderBy: { cookedAt: "desc" }, include: { user: true } },
      images: { orderBy: { sortOrder: "asc" } },
      nutrition: true,
      createdBy: { select: { name: true } },
      favorites: { where: { userId: user.id }, select: { id: true } },
    },
  });

  if (!recipe) notFound();

  const stats = computeCookStats(recipe.cookLogs);
  const photos = [recipe.photoUrl, ...recipe.images.map((img) => img.filename)].filter((f): f is string => f != null);

  return (
    <div className="page-shell">
      <Link href="/" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Torna alle ricette
      </Link>
      {photos.length > 0 ? (
        <TiltCard className="relative mb-6 h-72 w-full overflow-hidden shadow-md sm:h-96">
          <RecipePhotoCarousel photos={photos} title={recipe.title} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-5 sm:p-6">
            <h1 className="max-w-3xl font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">{recipe.title}</h1>
          </div>
        </TiltCard>
      ) : (
        <h1 className="mb-5 max-w-3xl font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{recipe.title}</h1>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3 shadow-sm">
        <Link href={`/recipes/${recipe.id}/cook`} className={buttonClasses("primary", "md")}>
          <ChefHat className="h-4 w-4" aria-hidden="true" /> Cucina
        </Link>
        <Link href={`/recipes/${recipe.id}/print`} className={buttonClasses("secondary", "md")} aria-label="Stampa">
          <Printer className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Stampa</span>
        </Link>
        <Link href={`/recipes/${recipe.id}/edit`} className={buttonClasses("secondary", "md")} aria-label="Modifica">
          <Pencil className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Modifica</span>
        </Link>
        <div className="ml-auto flex items-center gap-2 sm:border-l sm:border-border sm:pl-3">
          <FavoriteButton recipeId={recipe.id} initialFavorite={recipe.favorites.length > 0} />
          <DeleteRecipeButton recipeId={recipe.id} />
        </div>
      </div>

      {recipe.description && <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">{recipe.description}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {recipe.tags.map((tag) => (
          <Badge key={tag.id} variant="accent">{tag.name}</Badge>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        {recipe.prepTimeMinutes != null && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Prep: {recipe.prepTimeMinutes} min
          </span>
        )}
        {recipe.cookTimeMinutes != null && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Cottura: {recipe.cookTimeMinutes} min
          </span>
        )}
        {recipe.prepTimeMinutes != null && recipe.cookTimeMinutes != null && (
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Totale: {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min
          </span>
        )}
        {stats.timesCooked > 0 && (
          <span className="inline-flex items-center gap-1">
            <ChefHat className="h-3.5 w-3.5" aria-hidden="true" /> Cucinata {stats.timesCooked} {stats.timesCooked === 1 ? "volta" : "volte"}
          </span>
        )}
        {stats.avgRating != null && (
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true" /> {stats.avgRating.toFixed(1)}
          </span>
        )}
        {recipe.sourceUrl && (
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:text-primary-hover"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Fonte
          </a>
        )}
        {recipe.videoUrl && (
          <a
            href={recipe.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:text-primary-hover"
          >
            <Video className="h-3.5 w-3.5" aria-hidden="true" /> Guarda il video
          </a>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        <span title={formatRelativeDate(recipe.createdAt.toISOString())}>Aggiunta il {formatDate(recipe.createdAt.toISOString())}</span>
        {recipe.updatedAt.getTime() - recipe.createdAt.getTime() > EDIT_THRESHOLD_MS && (
          <> · <span title={formatRelativeDate(recipe.updatedAt.toISOString())}>modificata il {formatDate(recipe.updatedAt.toISOString())}</span></>
        )}
        {" · "}
        {recipe.createdBy.name}
      </p>

      {recipe.equipment.length > 0 && (
        <Reveal>
          <section className="mt-8">
            <h2 className="mb-3 font-display text-xl font-semibold text-foreground">Attrezzatura</h2>
            <div className="flex flex-wrap gap-2">
              {recipe.equipment.map((item) => (
                <Badge key={item}>{item}</Badge>
              ))}
            </div>
          </section>
        </Reveal>
      )}

      <Reveal>
        <section className="mt-10">
          <Card className="p-4 sm:p-5">
            <h2 className="mb-3 font-display text-xl font-semibold text-foreground">Ingredienti</h2>
            <ServingsAdjuster
              recipeId={recipe.id}
              baseServings={recipe.servingsBase}
              ingredients={recipe.ingredients}
            />
          </Card>
        </section>
      </Reveal>

      <Reveal>
        <section className="mt-10">
          <h2 className="mb-3 font-display text-xl font-semibold text-foreground">Passaggi</h2>
          <ol className="space-y-3">
            {recipe.steps.map((step) => (
              <li key={step.id} className="flex gap-3 rounded-lg border border-border bg-surface px-4 py-4 text-foreground shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-md">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-sm font-semibold text-muted-foreground">{step.sortOrder + 1}</span>
                {step.imageFilename && (
                  <StepImageThumb filename={step.imageFilename} alt={`Passaggio ${step.sortOrder + 1}`} />
                )}
                <span className="min-w-0 flex-1 leading-7">
                  {step.instruction}
                  {step.optional && (
                    <Badge variant="neutral" size="sm" className="ml-2">
                      facoltativo
                    </Badge>
                  )}
                  {step.timerMinutes != null && (
                    <span className="ml-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {step.timerMinutes} min
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </Reveal>

      {recipe.nutrition && (
        <Reveal>
          <section className="mt-10">
            <h2 className="mb-3 font-display text-xl font-semibold text-foreground">Valori nutrizionali <span className="font-sans text-sm font-normal text-muted-foreground">per porzione</span></h2>
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {NUTRITION_FIELDS.map(({ key, label, unit }) => {
                const value = recipe.nutrition![key];
                if (value == null) return null;
                return (
                  <div key={key} className="flex justify-between gap-2 rounded-md bg-surface-secondary px-3 py-2">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-medium text-foreground">
                      {value}
                      {unit}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        </Reveal>
      )}

      <Reveal>
        <CookLogSection
          recipeId={recipe.id}
          initialLogs={recipe.cookLogs.map((log) => ({
            id: log.id,
            cookedAt: log.cookedAt.toISOString(),
            rating: log.rating,
            notes: log.notes,
            user: { name: log.user.name },
          }))}
        />
      </Reveal>
    </div>
  );
}
