import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

const rejectSchema = z.object({ recipeId: z.string() });

export async function POST(request: Request) {
  const { user, unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const parsed = rejectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Dati non validi" }, { status: 400 });
  }

  const { recipeId } = parsed.data;
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
