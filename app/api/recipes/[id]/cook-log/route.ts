import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { findOrNotFound, type RouteParams } from "@/lib/apiRoute";

export async function POST(_request: Request, { params }: RouteParams<{ id: string }>) {
  const { user, unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id: recipeId } = await params;
  const { notFound } = await findOrNotFound(() => prisma.recipe.findUnique({ where: { id: recipeId } }), "Ricetta non trovata");
  if (notFound) return notFound;

  const cookLog = await prisma.cookLog.create({
    data: { recipeId, userId: user.id },
    include: { user: { select: { name: true } } },
  });

  return Response.json(cookLog, { status: 201 });
}
