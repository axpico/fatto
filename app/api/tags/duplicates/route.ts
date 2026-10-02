import { prisma } from "@/lib/db";
import { requireApiAdmin } from "@/lib/auth";
import type { DuplicatePair } from "@/lib/tagDedupe";

export async function GET() {
  const { unauthorized } = await requireApiAdmin();
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
