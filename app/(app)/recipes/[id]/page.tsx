import Link from "next/link";
import { notFound } from "next/navigation";
import { ChefHat, Printer, Pencil, Clock, ExternalLink, Video } from "lucide-react";
import { prisma } from "@/lib/db";
import { ServingsAdjuster } from "@/components/ServingsAdjuster";
import { DeleteRecipeButton } from "@/components/DeleteRecipeButton";
import { CookLogSection } from "@/components/CookLogSection";
import { StepImageThumb } from "@/components/StepImageThumb";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { formatDate, formatRelativeDate } from "@/lib/formatDate";
import { Reveal } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";

// ponytail: 60s di margine assorbe lo scarto tra createdAt (orologio DB) e updatedAt
// (orologio Prisma) su una riga appena creata; una modifica vera arriva quasi sempre dopo
const EDIT_THRESHOLD_MS = 60_000;

const NUTRITION_FIELDS: { key: "caloriesKcal" | "proteinG" | "carbsG" | "fatG" | "fiberG" | "sugarG" | "saturatedFatG" | "sodiumMg"; label: string; unit: string }[] = [
  { key: "caloriesKcal", label: "Calorie", unit: " kcal" },
  { key: "proteinG", label: "Proteine", unit: " g" },
  { key: "carbsG", label: "Carboidrati", unit: " g" },
  { key: "fatG", label: "Grassi", unit: " g" },
  { key: "fiberG", label: "Fibre", unit: " g" },
  { key: "sugarG", label: "Zuccheri", unit: " g" },
  { key: "saturatedFatG", label: "di cui saturi", unit: " g" },
  { key: "sodiumMg", label: "Sodio", unit: " mg" },
];

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: { orderBy: { sortOrder: "asc" } },
      steps: { orderBy: { sortOrder: "asc" } },
      tags: true,
      cookLogs: { orderBy: { cookedAt: "desc" }, include: { user: true } },
      images: { orderBy: { sortOrder: "asc" } },
      nutrition: true,
      createdBy: { select: { name: true } },
    },
  });

  if (!recipe) notFound();

  return (
    <div className="page-shell">
      {recipe.photoUrl ? (
        <TiltCard className="relative mb-6 h-72 w-full overflow-hidden shadow-md sm:h-96">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/uploads/${recipe.photoUrl}`}
            alt={recipe.title}
            width={800}
            height={256}
            loading="eager"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-5 sm:p-6">
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
        <Link href={`/recipes/${recipe.id}/print`} className={buttonClasses("secondary", "sm")}>
          <Printer className="h-4 w-4" aria-hidden="true" /> PDF
        </Link>
        <Link href={`/recipes/${recipe.id}/edit`} className={buttonClasses("secondary", "sm")}>
          <Pencil className="h-4 w-4" aria-hidden="true" /> Modifica
        </Link>
        <div className="ml-auto pl-1">
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

      {recipe.images.length > 0 && (
        <Reveal>
          <section className="mt-10">
            <h2 className="mb-3 font-display text-xl font-semibold text-foreground">Galleria</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {recipe.images.map((img, idx) => (
                <StepImageThumb
                  key={img.id}
                  filename={img.filename}
                  alt={`Foto ${recipe.title} ${idx + 1}`}
                  className="h-28 w-28"
                />
              ))}
            </div>
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
