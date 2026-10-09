import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { env } from "@/lib/env";

// ponytail: bootstrap/reset via env vars instead of a signup page (decision confirmed with user).
// Runs on every server boot (see instrumentation.ts); upsert-by-email makes it idempotent, so
// restarting the container after changing ADMIN_EMAIL/ADMIN_PASSWORD adds/resets a user.
export async function seedAdminUser() {
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password, ADMIN_NAME: name } = env;

  if (!email || !password) {
    console.warn("[seed] ADMIN_EMAIL/ADMIN_PASSWORD non impostate, salto il bootstrap utente");
    return;
  }

  const passwordHash = await hashPassword(password);

  // emails are stored lowercase; case-insensitive lookup so an older mixed-case row is updated
  // instead of duplicated
  const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { passwordHash, name, isAdmin: true } });
  } else {
    await prisma.user.create({ data: { email: email.trim().toLowerCase(), passwordHash, name, isAdmin: true } });
  }

  console.log(`[seed] Utente pronto: ${email}`);
}
