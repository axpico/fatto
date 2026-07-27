import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

type DuplicatePair = { aId: string; aName: string; bId: string; bName: string; sim: number };

export async function GET() {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const pairs = await prisma.$queryRaw<DuplicatePair[]>`
    SELECT a.id AS "aId", a.name AS "aName", b.id AS "bId", b.name AS "bName",
           similarity(a.name, b.name) AS sim
    FROM "Tag" a JOIN "Tag" b ON a.id < b.id
    WHERE similarity(a.name, b.name) > 0.35 OR lower(a.name) = lower(b.name)
    ORDER BY sim DESC
  `;

  return Response.json(pairs);
}
