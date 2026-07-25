import Link from "next/link";
import { notFound } from "next/navigation";
import { ChefHat, Printer, Pencil, Clock, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { findPantryMatchesForRecipe } from "@/lib/ingredientSearch";
import { ServingsAdjuster } from "@/components/ServingsAdjuster";
import { DeleteRecipeButton } from "@/components/DeleteRecipeButton";
import { CookLogSection } from "@/components/CookLogSection";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: { orderBy: { sortOrder: "asc" } },
      steps: { orderBy: { sortOrder: "asc" } },
      tags: true,
      cookLogs: { orderBy: { cookedAt: "desc" }, include: { user: true } },
    },
  });

  if (!recipe) notFound();

  const pantryItems = await prisma.pantryItem.findMany({ select: { name: true } });
  const inPantry = await findPantryMatchesForRecipe(
    recipe.id,
    pantryItems.map((p) => p.name),
  );

  return (
    <div className="p-4">
      {recipe.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/uploads/${recipe.photoUrl}`}
          alt={recipe.title}
          className="mb-4 h-48 w-full rounded-xl object-cover"
        />
      )}

      <div className="flex items-start justify-between gap-2">
        <h1 className="text-xl font-semibold text-foreground">{recipe.title}</h1>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <Link href={`/recipes/${recipe.id}/cook`} className={buttonClasses("primary", "sm")}>
            <ChefHat className="h-4 w-4" aria-hidden="true" /> Cucina
          </Link>
          <Link href={`/recipes/${recipe.id}/print`} className={buttonClasses("secondary", "sm")}>
            <Printer className="h-4 w-4" aria-hidden="true" /> PDF
          </Link>
          <Link href={`/recipes/${recipe.id}/edit`} className={buttonClasses("secondary", "sm")}>
            <Pencil className="h-4 w-4" aria-hidden="true" /> Modifica
          </Link>
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
      </div>

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
