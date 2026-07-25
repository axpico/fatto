import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

export async function GET() {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const ingredients = await prisma.ingredientCatalog.findMany({ orderBy: { name: "asc" } });
  return Response.json(ingredients);
}
