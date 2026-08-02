import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { findOrNotFound } from "@/lib/apiRoute";

const mergeSchema = z.object({ keepId: z.string().min(1), mergeId: z.string().min(1) });

export async function POST(request: Request) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const parsed = mergeSchema.safeParse(body);
  if (!parsed.success || parsed.data.keepId === parsed.data.mergeId) {
    return Response.json({ error: "Richiesta di unione non valida" }, { status: 400 });
  }
  const { keepId, mergeId } = parsed.data;

  const { record: mergeTag, notFound } = await findOrNotFound(
    () => prisma.tag.findUnique({ where: { id: mergeId }, include: { recipes: { select: { id: true } } } }),
    "Tag non trovato",
  );
  if (notFound) return notFound;

  await prisma.$transaction([
    ...mergeTag.recipes.map((recipe) =>
      prisma.recipe.update({
        where: { id: recipe.id },
        data: { tags: { connect: { id: keepId }, disconnect: { id: mergeId } } },
      }),
    ),
    prisma.tag.delete({ where: { id: mergeId } }),
  ]);

  return Response.json({ ok: true });
}
