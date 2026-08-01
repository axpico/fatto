import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

const SESSION_COOKIE = "session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 giorni

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  // ponytail: piggyback la pulizia delle sessioni scadute su ogni login invece di un cron —
  // unico ritmo realistico per un'app familiare a singolo processo
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.COOKIE_SECURE,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Per Route Handler: niente redirect, torna una 401 pronta da restituire. */
export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, unauthorized: Response.json({ error: "Non autenticato" }, { status: 401 }) };
  }
  return { user, unauthorized: null };
}

/** Come requireApiUser, ma richiede anche isAdmin (403 invece di 401 se autenticato ma non admin). */
export async function requireApiAdmin() {
  const { user, unauthorized } = await requireApiUser();
  if (unauthorized) return { user: null, unauthorized };
  if (!user.isAdmin) {
    return { user: null, unauthorized: Response.json({ error: "Non autorizzato" }, { status: 403 }) };
  }
  return { user, unauthorized: null };
}
