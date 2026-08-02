import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { findOrNotFound, type RouteParams } from "@/lib/apiRoute";

type Params = RouteParams<{ id: string }>;

const patchSchema = z.object({ favorite: z.boolean() });

export async function PATCH(request: Request, { params }: Params) {
  const { user, unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Dati non validi" }, { status: 400 });
  }

  const { notFound } = await findOrNotFound(() => prisma.recipe.findUnique({ where: { id } }), "Ricetta non trovata");
  if (notFound) return notFound;

  if (parsed.data.favorite) {
    await prisma.favorite.upsert({
      where: { userId_recipeId: { userId: user.id, recipeId: id } },
      create: { userId: user.id, recipeId: id },
      update: {},
    });
  } else {
    await prisma.favorite.deleteMany({ where: { userId: user.id, recipeId: id } });
  }

  return Response.json({ favorite: parsed.data.favorite });
}
