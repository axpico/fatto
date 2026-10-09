import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

const rejectSchema = z.object({ recipeId: z.string().min(1).max(64) });

export async function POST(request: Request) {
  const { user, unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const parsed = rejectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Dati non validi" }, { status: 400 });
  }

  const { recipeId } = parsed.data;
  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId }, select: { id: true } });
  // already deleted (e.g. by another family member): nothing to pause
  if (!recipe) return Response.json({ error: "Ricetta non trovata" }, { status: 404 });
  await prisma.swipeReject.upsert({
    where: { userId_recipeId: { userId: user.id, recipeId } },
    create: { userId: user.id, recipeId },
    update: { rejectedAt: new Date() },
  });

  return Response.json({ ok: true });
}

export async function DELETE() {
  const { user, unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  await prisma.swipeReject.deleteMany({ where: { userId: user.id } });
  return Response.json({ ok: true });
}
