import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

export async function GET() {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const items = await prisma.pantryItem.findMany({ orderBy: { name: "asc" } });
  return Response.json(items);
}

const createSchema = z.object({
  name: z.string().trim().min(1),
  quantity: z.number().positive().nullable().optional(),
  unit: z.string().trim().min(1).nullable().optional(),
});

export async function POST(request: Request) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Dati non validi" }, { status: 400 });
  }

  const item = await prisma.pantryItem.create({ data: parsed.data });
  return Response.json(item, { status: 201 });
}
