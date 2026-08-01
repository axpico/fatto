import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { isRateLimited, recordAttempt, clearRateLimit } from "@/lib/rateLimit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const MAX_FAILS = 5;
const LOCKOUT_MS = 30_000;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Credenziali non valide" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const key = `login:${email}`;
  if (isRateLimited(key, MAX_FAILS, LOCKOUT_MS)) {
    return Response.json(
      { error: "Troppi tentativi falliti. Riprova tra qualche secondo." },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !valid) {
    recordAttempt(key, LOCKOUT_MS);
    return Response.json({ error: "Email o password errati" }, { status: 401 });
  }

  clearRateLimit(key);
  await createSession(user.id);
  return Response.json({ ok: true });
}
