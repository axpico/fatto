import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const MAX_FAILS = 5;
const LOCKOUT_MS = 30_000;

// ponytail: lockout in-memory per email, single-instance — si azzera al riavvio del container e
// non è condiviso tra repliche. Sufficiente per un'app familiare a singolo processo; se mai
// diventasse multi-istanza, spostare su uno store condiviso (Redis).
const failsByEmail = new Map<string, { fails: number; lockedUntil: number }>();

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Credenziali non valide" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const entry = failsByEmail.get(email);
  if (entry && entry.lockedUntil > Date.now()) {
    return Response.json(
      { error: "Troppi tentativi falliti. Riprova tra qualche secondo." },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !valid) {
    const fails = (entry?.fails ?? 0) + 1;
    failsByEmail.set(
      email,
      fails >= MAX_FAILS ? { fails: 0, lockedUntil: Date.now() + LOCKOUT_MS } : { fails, lockedUntil: 0 },
    );
    return Response.json({ error: "Email o password errati" }, { status: 401 });
  }

  failsByEmail.delete(email);
  await createSession(user.id);
  return Response.json({ ok: true });
}
