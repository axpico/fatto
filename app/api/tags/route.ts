import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

export async function GET() {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
  return Response.json(tags);
}

const createTagSchema = z.object({ name: z.string().trim().min(1) });

export async function POST(request: Request) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const parsed = createTagSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Nome tag non valido" }, { status: 400 });
  }

  const name = parsed.data.name.toLowerCase();
  const tag = await prisma.tag.upsert({
    where: { name },
    create: { name },
    update: {},
  });

  return Response.json(tag);
}
