import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  rating: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Dati non validi" }, { status: 400 });
  }

  const existing = await prisma.cookLog.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Cottura non trovata" }, { status: 404 });

  const cookLog = await prisma.cookLog.update({ where: { id }, data: parsed.data });
  return Response.json(cookLog);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const existing = await prisma.cookLog.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Cottura non trovata" }, { status: 404 });

  await prisma.cookLog.delete({ where: { id } });
  return Response.json({ ok: true });
}
