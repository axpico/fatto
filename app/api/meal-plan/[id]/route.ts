import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  await prisma.mealPlan.delete({ where: { id } });
  return Response.json({ ok: true });
}
