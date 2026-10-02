import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

// Suggerimenti dagli ingredienti delle ricette esistenti: niente catalogo separato che cresce per sempre
export async function GET() {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const ingredients = await prisma.$queryRaw<{ name: string }[]>`
    SELECT DISTINCT lower(trim(name)) AS name FROM "Ingredient" ORDER BY 1
  `;
  return Response.json(ingredients);
}
