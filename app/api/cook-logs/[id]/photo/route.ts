import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { deleteUpload, saveUpload, UploadError } from "@/lib/uploads";
import { findOrNotFound, type RouteParams } from "@/lib/apiRoute";

type Params = RouteParams<{ id: string }>;

async function findOwnLog(id: string, userId: string) {
  return findOrNotFound(() => prisma.cookLog.findUnique({ where: { id, userId } }), "Cottura non trovata");
}

export async function POST(request: Request, { params }: Params) {
  const { user, unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const { record: existing, notFound } = await findOwnLog(id, user.id);
  if (notFound) return notFound;

  const formData = await request.formData().catch(() => null);
  const photo = formData?.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return Response.json({ error: "Nessuna foto ricevuta" }, { status: 400 });
  }

  let filename: string;
  try {
    filename = await saveUpload(photo);
  } catch (err) {
    if (err instanceof UploadError) return Response.json({ error: err.message }, { status: 400 });
    throw err;
  }

  const cookLog = await prisma.cookLog.update({ where: { id }, data: { photoFilename: filename } });
  await deleteUpload(existing.photoFilename);
  return Response.json(cookLog);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { user, unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const { record: existing, notFound } = await findOwnLog(id, user.id);
  if (notFound) return notFound;

  await prisma.cookLog.update({ where: { id }, data: { photoFilename: null } });
  await deleteUpload(existing.photoFilename);
  return Response.json({ ok: true });
}
