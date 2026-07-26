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
      images: { orderBy: { sortOrder: "asc" } },
      nutrition: true,
    },
  });

  if (!recipe) notFound();

  return (
    <div className="page-shell pb-0">
      <div className="page-header mb-2">
        <div>
          <h1 className="page-title">Modifica ricetta</h1>
          <p className="page-description">Aggiorna i dettagli e salva quando hai finito.</p>
        </div>
      </div>
      <RecipeForm
        recipeId={recipe.id}
        initialData={{
          title: recipe.title,
          description: recipe.description ?? "",
          servingsBase: recipe.servingsBase,
          prepTimeMinutes: recipe.prepTimeMinutes,
          cookTimeMinutes: recipe.cookTimeMinutes,
          sourceUrl: recipe.sourceUrl ?? "",
          videoUrl: recipe.videoUrl ?? "",
          equipment: recipe.equipment,
          nutrition: recipe.nutrition
            ? {
                caloriesKcal: recipe.nutrition.caloriesKcal,
                proteinG: recipe.nutrition.proteinG,
                carbsG: recipe.nutrition.carbsG,
                fatG: recipe.nutrition.fatG,
                fiberG: recipe.nutrition.fiberG,
                sugarG: recipe.nutrition.sugarG,
                saturatedFatG: recipe.nutrition.saturatedFatG,
                sodiumMg: recipe.nutrition.sodiumMg,
              }
            : undefined,
          photoUrl: recipe.photoUrl,
          gallery: recipe.images.map((img) => ({ kind: "existing" as const, filename: img.filename })),
          ingredients: recipe.ingredients.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            optional: i.optional,
          })),
          steps: recipe.steps.map((s) => ({
            instruction: s.instruction,
            timerMinutes: s.timerMinutes,
            optional: s.optional,
          })),
          tags: recipe.tags.map((t) => t.name),
        }}
      />
    </div>
  );
}
