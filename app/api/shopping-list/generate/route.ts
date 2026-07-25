import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { aggregateIngredients } from "@/lib/shoppingList";

const bodySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(request: Request) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Date non valide" }, { status: 400 });
  }

  const mealPlans = await prisma.mealPlan.findMany({
    where: {
      plannedDate: { gte: new Date(parsed.data.startDate), lte: new Date(parsed.data.endDate) },
    },
    include: { recipe: { include: { ingredients: true } } },
  });

  const rows = mealPlans.flatMap((mp) =>
    mp.recipe.ingredients.map((ing) => ({ name: ing.name, quantity: ing.quantity, unit: ing.unit })),
  );
  const aggregated = aggregateIngredients(rows);

  await prisma.shoppingListItem.deleteMany({ where: { source: "MEAL_PLAN", checked: false } });

  if (aggregated.length > 0) {
    await prisma.shoppingListItem.createMany({
      data: aggregated.map((row) => ({ ...row, source: "MEAL_PLAN" as const })),
    });
  }

  const items = await prisma.shoppingListItem.findMany({
    orderBy: [{ checked: "asc" }, { createdAt: "asc" }],
  });
  return Response.json(items);
}
