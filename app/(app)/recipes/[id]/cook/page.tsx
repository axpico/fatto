import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CookingModeViewer } from "@/components/CookingModeViewer";
import { orderedIngredientsAndSteps } from "@/lib/recipeInclude";

export default async function CookModePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: orderedIngredientsAndSteps,
  });

  if (!recipe) notFound();

  return (
    <CookingModeViewer
      recipeId={recipe.id}
      title={recipe.title}
      steps={recipe.steps}
      ingredients={recipe.ingredients}
      baseServings={recipe.servingsBase}
    />
  );
}
