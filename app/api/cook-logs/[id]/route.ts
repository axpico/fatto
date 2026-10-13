import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { deleteUpload } from "@/lib/uploads";
import { findOrNotFound, type RouteParams } from "@/lib/apiRoute";

type Params = RouteParams<{ id: string }>;

const patchSchema = z.object({
  rating: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  const { user, unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Dati non validi" }, { status: 400 });
  }

  const { notFound } = await findOrNotFound(
    () => prisma.cookLog.findUnique({ where: { id, userId: user.id } }),
    "Cottura non trovata",
  );
  if (notFound) return notFound;

  const cookLog = await prisma.cookLog.update({ where: { id }, data: parsed.data });
  return Response.json(cookLog);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { user, unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const { record: existing, notFound } = await findOrNotFound(
    () => prisma.cookLog.findUnique({ where: { id, userId: user.id } }),
    "Cottura non trovata",
  );
  if (notFound) return notFound;

  await prisma.cookLog.delete({ where: { id } });
  await deleteUpload(existing.photoFilename);
  return Response.json({ ok: true });
}
