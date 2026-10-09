import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CookingModeClient } from "@/components/CookingModeClient";
import { orderedIngredientsAndSteps } from "@/lib/recipeInclude";

export default async function CookModePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: orderedIngredientsAndSteps,
  });

  if (!recipe) notFound();

  return (
    <CookingModeClient
      recipeId={recipe.id}
      title={recipe.title}
      steps={recipe.steps}
      ingredients={recipe.ingredients}
      baseServings={recipe.servingsBase}
    />
  );
}
