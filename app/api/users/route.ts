import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, requireApiAdmin } from "@/lib/auth";
import { userSelect } from "@/lib/users";

const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(200),
  name: z.string().trim().min(1).max(100),
});

export async function GET() {
  const { unauthorized } = await requireApiAdmin();
  if (unauthorized) return unauthorized;

  const users = await prisma.user.findMany({ select: userSelect, orderBy: { createdAt: "asc" } });
  return Response.json(users);
}

export async function POST(request: Request) {
  const { unauthorized } = await requireApiAdmin();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Dati non validi" }, { status: 400 });
  }
  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (existing) {
    return Response.json({ error: "Email già in uso" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, passwordHash, name }, select: userSelect });
  return Response.json(user, { status: 201 });
}
