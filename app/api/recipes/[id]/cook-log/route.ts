import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id: recipeId } = await params;
  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe) return Response.json({ error: "Ricetta non trovata" }, { status: 404 });

  const cookLog = await prisma.cookLog.create({
    data: { recipeId, userId: user!.id },
    include: { user: true },
  });

  return Response.json(cookLog, { status: 201 });
}
