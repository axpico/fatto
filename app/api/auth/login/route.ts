import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { isRateLimited, recordAttempt, clearRateLimit, retryAfterSeconds } from "@/lib/rateLimit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const MAX_FAILS = 5;
const LOCKOUT_MS = 30_000;

// Oltre al limite per-email: senza reverse proxy garantito davanti all'app (vedi README, il deploy
// può girare anche in solo-LAN), un IP client non è affidabile da leggere qui — un contatore
// globale sui fallimenti impedisce comunque a un attaccante di aggirare il lockout per-email
// distribuendo i tentativi su tante email diverse in parallelo.
const GLOBAL_KEY = "login:__global__";
const GLOBAL_MAX_FAILS = 20;
const GLOBAL_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Credenziali non valide" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const key = `login:${email}`;
  const limitedKey = isRateLimited(key, MAX_FAILS, LOCKOUT_MS)
    ? key
    : isRateLimited(GLOBAL_KEY, GLOBAL_MAX_FAILS, GLOBAL_WINDOW_MS)
      ? GLOBAL_KEY
      : null;
  if (limitedKey) {
    const seconds = Math.max(1, retryAfterSeconds(limitedKey));
    return Response.json(
      { error: `Troppi tentativi falliti. Riprova tra ${seconds} secondi.` },
      { status: 429, headers: { "Retry-After": String(seconds) } },
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !valid) {
    recordAttempt(key, LOCKOUT_MS);
    recordAttempt(GLOBAL_KEY, GLOBAL_WINDOW_MS);
    return Response.json({ error: "Email o password errati" }, { status: 401 });
  }

  clearRateLimit(key);
  await createSession(user.id);
  return Response.json({ ok: true });
}
