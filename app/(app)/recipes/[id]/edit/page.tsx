import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { RecipeForm } from "@/components/RecipeForm";

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: { orderBy: { sortOrder: "asc" } },
      steps: { orderBy: { sortOrder: "asc" } },
      tags: true,
    },
  });

  if (!recipe) notFound();

  return (
    <div>
      <h1 className="px-4 pt-4 text-lg font-semibold text-foreground">Modifica ricetta</h1>
      <RecipeForm
        recipeId={recipe.id}
        initialData={{
          title: recipe.title,
          description: recipe.description ?? "",
          servingsBase: recipe.servingsBase,
          prepTimeMinutes: recipe.prepTimeMinutes,
          cookTimeMinutes: recipe.cookTimeMinutes,
          sourceUrl: recipe.sourceUrl ?? "",
          photoUrl: recipe.photoUrl,
          ingredients: recipe.ingredients.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
          })),
          steps: recipe.steps.map((s) => ({
            instruction: s.instruction,
            timerMinutes: s.timerMinutes,
          })),
          tags: recipe.tags.map((t) => t.name),
        }}
      />
    </div>
  );
}
