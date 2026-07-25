import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PrintButton } from "@/components/PrintButton";

export default async function PrintRecipePage({ params }: { params: Promise<{ id: string }> }) {
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
    <div className="mx-auto max-w-2xl bg-white p-6 text-black print:p-0">
      <PrintButton />

      <h1 className="text-2xl font-bold">{recipe.title}</h1>
      {recipe.description && <p className="mt-1 text-neutral-700">{recipe.description}</p>}

      <div className="mt-2 flex gap-4 text-sm text-neutral-700">
        <span>Porzioni: {recipe.servingsBase}</span>
        {recipe.prepTimeMinutes != null && <span>Prep: {recipe.prepTimeMinutes} min</span>}
        {recipe.cookTimeMinutes != null && <span>Cottura: {recipe.cookTimeMinutes} min</span>}
      </div>

      {recipe.tags.length > 0 && (
        <p className="mt-1 text-sm text-neutral-600">
          {recipe.tags.map((t) => t.name).join(" · ")}
        </p>
      )}

      <hr className="my-4 border-neutral-300" />

      <h2 className="text-lg font-semibold">Ingredienti</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {recipe.ingredients.map((ing) => (
          <li key={ing.id}>
            {ing.quantity != null && (
              <strong>
                {ing.quantity} {ing.unit ?? ""}{" "}
              </strong>
            )}
            {ing.name}
          </li>
        ))}
      </ul>

      <h2 className="mt-6 text-lg font-semibold">Passaggi</h2>
      <ol className="mt-2 list-decimal space-y-2 pl-5">
        {recipe.steps.map((step) => (
          <li key={step.id}>
            {step.instruction}
            {step.timerMinutes != null && ` (${step.timerMinutes} min)`}
          </li>
        ))}
      </ol>

      {recipe.sourceUrl && (
        <p className="mt-6 text-xs text-neutral-500">Fonte: {recipe.sourceUrl}</p>
      )}
    </div>
  );
}
