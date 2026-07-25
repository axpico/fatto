import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

// ponytail: bootstrap/reset via env vars instead of a signup page (decision confirmed with user).
// Runs on every server boot (see instrumentation.ts); upsert-by-email makes it idempotent, so
// restarting the container after changing ADMIN_EMAIL/ADMIN_PASSWORD adds/resets a user.
export async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Admin";

  if (!email || !password) {
    console.warn("[seed] ADMIN_EMAIL/ADMIN_PASSWORD non impostate, salto il bootstrap utente");
    return;
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, name },
    update: { passwordHash, name },
  });

  console.log(`[seed] Utente pronto: ${email}`);
}
