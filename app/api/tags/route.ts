import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

export async function GET() {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
  return Response.json(tags);
}
