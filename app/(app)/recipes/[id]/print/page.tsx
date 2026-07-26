import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PrintButton } from "@/components/PrintButton";
import { Badge } from "@/components/ui/Badge";

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

export default async function PrintRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: { orderBy: { sortOrder: "asc" } },
      steps: { orderBy: { sortOrder: "asc" } },
      tags: true,
      nutrition: true,
      images: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!recipe) notFound();

  return (
    <div className="mx-auto min-h-screen max-w-3xl bg-surface p-5 text-foreground sm:my-8 sm:rounded-xl sm:border sm:border-border sm:p-8 sm:shadow-sm print:my-0 print:max-w-none print:p-0">
      <PrintButton />

      {recipe.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/uploads/${recipe.photoUrl}`}
          alt={recipe.title}
          className="mb-4 h-56 w-full rounded-lg object-cover print:break-inside-avoid"
        />
      )}

      <h1 className="font-display text-3xl font-semibold tracking-tight">{recipe.title}</h1>
      {recipe.description && <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">{recipe.description}</p>}

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span>Porzioni: {recipe.servingsBase}</span>
        {recipe.prepTimeMinutes != null && <span>Prep: {recipe.prepTimeMinutes} min</span>}
        {recipe.cookTimeMinutes != null && <span>Cottura: {recipe.cookTimeMinutes} min</span>}
      </div>

      {recipe.tags.length > 0 && (
        <p className="mt-1 text-sm text-muted-foreground">
          {recipe.tags.map((t) => t.name).join(" · ")}
        </p>
      )}

      <hr className="my-6 border-border" />

      {recipe.equipment.length > 0 && (
        <section className="break-inside-avoid">
          <h2 className="font-display text-xl font-semibold">Attrezzatura</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {recipe.equipment.map((item) => (
              <Badge key={item}>{item}</Badge>
            ))}
          </div>
        </section>
      )}

      <h2 className="mt-8 font-display text-xl font-semibold">Ingredienti</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {recipe.ingredients.map((ing) => (
          <li key={ing.id} className="break-inside-avoid">
            {ing.quantity != null && (
              <strong>
                {ing.quantity} {ing.unit ?? ""}{" "}
              </strong>
            )}
            {ing.name}
            {ing.optional && " (facoltativo)"}
          </li>
        ))}
      </ul>

      <h2 className="mt-8 font-display text-xl font-semibold">Passaggi</h2>
      <ol className="mt-2 list-decimal space-y-2 pl-5">
        {recipe.steps.map((step) => (
          <li key={step.id} className="break-inside-avoid">
            {step.instruction}
            {step.timerMinutes != null && ` (${step.timerMinutes} min)`}
            {step.optional && " (facoltativo)"}
          </li>
        ))}
      </ol>

      {recipe.nutrition && (
        <section className="mt-6 break-inside-avoid">
          <h2 className="font-display text-xl font-semibold">Valori nutrizionali (per porzione)</h2>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
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
          <h2 className="text-lg font-semibold">Galleria</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {recipe.images.map((img, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={`/api/uploads/${img.filename}`}
                alt={`Foto ${recipe.title} ${idx + 1}`}
                className="aspect-square w-full rounded-lg object-cover print:break-inside-avoid"
              />
            ))}
          </div>
        </section>
      )}

      {recipe.sourceUrl && (
        <p className="mt-6 text-xs text-muted-foreground">Fonte: {recipe.sourceUrl}</p>
      )}
    </div>
  );
}
