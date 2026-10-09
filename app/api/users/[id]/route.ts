import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiAdmin, hashPassword } from "@/lib/auth";
import { userSelect } from "@/lib/users";
import { findOrNotFound, type RouteParams } from "@/lib/apiRoute";

type Params = RouteParams<{ id: string }>;

const patchSchema = z.union([
  z.object({ isAdmin: z.boolean() }),
  z.object({ resetPassword: z.literal(true) }),
]);

export async function PATCH(request: Request, { params }: Params) {
  const { user, unauthorized } = await requireApiAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  if (id === user.id) {
    return Response.json({ error: "Non puoi modificare il tuo account" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Dati non validi" }, { status: 400 });
  }

  const { notFound } = await findOrNotFound(() => prisma.user.findUnique({ where: { id } }), "Utente non trovato");
  if (notFound) return notFound;

  if ("resetPassword" in parsed.data) {
    // generated server-side and shown once to the admin; existing sessions are revoked so a
    // reset actually locks out whoever had the old password
    const temporaryPassword = randomBytes(9).toString("base64url");
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(temporaryPassword) } }),
      prisma.session.deleteMany({ where: { userId: id } }),
    ]);
    return Response.json({ temporaryPassword });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isAdmin: parsed.data.isAdmin },
    select: userSelect,
  });
  return Response.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { user, unauthorized } = await requireApiAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  if (id === user.id) {
    return Response.json({ error: "Non puoi eliminare il tuo account" }, { status: 400 });
  }

  const { notFound } = await findOrNotFound(() => prisma.user.findUnique({ where: { id } }), "Utente non trovato");
  if (notFound) return notFound;

  const [recipeCount, cookLogCount] = await Promise.all([
    prisma.recipe.count({ where: { createdById: id } }),
    prisma.cookLog.count({ where: { userId: id } }),
  ]);
  if (recipeCount > 0 || cookLogCount > 0) {
    return Response.json(
      { error: "Impossibile eliminare: l'utente ha ricette o cronologia associate" },
      { status: 409 },
    );
  }

  await prisma.user.delete({ where: { id } });
  return Response.json({ ok: true });
}
