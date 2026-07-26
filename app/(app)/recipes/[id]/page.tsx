import Link from "next/link";
import { notFound } from "next/navigation";
import { ChefHat, Printer, Pencil, Clock, ExternalLink, Video } from "lucide-react";
import { prisma } from "@/lib/db";
import { findPantryMatchesForRecipe } from "@/lib/ingredientSearch";
import { ServingsAdjuster } from "@/components/ServingsAdjuster";
import { DeleteRecipeButton } from "@/components/DeleteRecipeButton";
import { CookLogSection } from "@/components/CookLogSection";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";

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
  const [recipe, pantryItems] = await Promise.all([
    prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: { orderBy: { sortOrder: "asc" } },
        steps: { orderBy: { sortOrder: "asc" } },
        tags: true,
        cookLogs: { orderBy: { cookedAt: "desc" }, include: { user: true } },
        images: { orderBy: { sortOrder: "asc" } },
        nutrition: true,
      },
    }),
    prisma.pantryItem.findMany({ select: { name: true } }),
  ]);

  if (!recipe) notFound();

  const inPantry = await findPantryMatchesForRecipe(
    recipe.id,
    pantryItems.map((p) => p.name),
  );

  return (
    <div className="p-4">
      {recipe.photoUrl ? (
        <div className="relative mb-4 h-64 w-full overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/uploads/${recipe.photoUrl}`}
            alt={recipe.title}
            width={800}
            height={256}
            loading="eager"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <h1 className="font-display text-2xl font-semibold text-white">{recipe.title}</h1>
          </div>
        </div>
      ) : (
        <h1 className="mb-4 font-display text-xl font-semibold text-foreground">{recipe.title}</h1>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/recipes/${recipe.id}/cook`} className={buttonClasses("primary", "sm")}>
          <ChefHat className="h-4 w-4" aria-hidden="true" /> Cucina
        </Link>
        <Link href={`/recipes/${recipe.id}/print`} className={buttonClasses("secondary", "sm")}>
          <Printer className="h-4 w-4" aria-hidden="true" /> PDF
        </Link>
        <Link href={`/recipes/${recipe.id}/edit`} className={buttonClasses("secondary", "sm")}>
          <Pencil className="h-4 w-4" aria-hidden="true" /> Modifica
        </Link>
        <div className="ml-auto">
          <DeleteRecipeButton recipeId={recipe.id} />
        </div>
      </div>

      {recipe.description && <p className="mt-2 text-muted-foreground">{recipe.description}</p>}

      <div className="mt-2 flex flex-wrap gap-2">
        {recipe.tags.map((tag) => (
          <Badge key={tag.id}>{tag.name}</Badge>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
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

      {recipe.equipment.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-semibold text-foreground">Attrezzatura</h2>
          <div className="flex flex-wrap gap-2">
            {recipe.equipment.map((item) => (
              <Badge key={item}>{item}</Badge>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 font-semibold text-foreground">Ingredienti</h2>
        <ServingsAdjuster
          baseServings={recipe.servingsBase}
          ingredients={recipe.ingredients}
          inPantry={[...inPantry]}
        />
      </section>

      <section className="mt-6">
        <h2 className="mb-2 font-semibold text-foreground">Passaggi</h2>
        <ol className="space-y-2">
          {recipe.steps.map((step) => (
            <li key={step.id} className="flex gap-2 text-foreground">
              <span className="font-medium text-muted-foreground">{step.sortOrder + 1}.</span>
              <span>
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

      {recipe.nutrition && (
        <section className="mt-6">
          <h2 className="mb-2 font-semibold text-foreground">Valori nutrizionali (per porzione)</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {NUTRITION_FIELDS.map(({ key, label, unit }) => {
              const value = recipe.nutrition![key];
              if (value == null) return null;
              return (
                <div key={key} className="flex justify-between gap-2">
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
      )}

      {recipe.images.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-semibold text-foreground">Galleria</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {recipe.images.map((img, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={`/api/uploads/${img.filename}`}
                alt={`Foto ${recipe.title} ${idx + 1}`}
                className="h-24 w-24 shrink-0 rounded-lg object-cover"
              />
            ))}
          </div>
        </section>
      )}

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
    </div>
  );
}
