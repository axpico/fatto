import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

export async function GET(request: Request) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end) {
    return Response.json({ error: "start ed end sono richiesti (YYYY-MM-DD)" }, { status: 400 });
  }

  const entries = await prisma.mealPlan.findMany({
    where: { plannedDate: { gte: new Date(start), lte: new Date(end) } },
    include: { recipe: { select: { id: true, title: true, photoUrl: true } } },
    orderBy: { plannedDate: "asc" },
  });

  return Response.json(entries);
}

const createSchema = z.object({
  recipeId: z.string().min(1),
  plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealSlot: z.enum(["COLAZIONE", "PRANZO", "CENA"]),
});

export async function POST(request: Request) {
  const { user, unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Dati non validi" }, { status: 400 });
  }

  const entry = await prisma.mealPlan.create({
    data: {
      recipeId: parsed.data.recipeId,
      plannedDate: new Date(parsed.data.plannedDate),
      mealSlot: parsed.data.mealSlot,
      userId: user!.id,
    },
    include: { recipe: { select: { id: true, title: true, photoUrl: true } } },
  });

  return Response.json(entry, { status: 201 });
}
