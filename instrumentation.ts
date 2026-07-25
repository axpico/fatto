export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { seedAdminUser } = await import("@/lib/seed");
    await seedAdminUser();
  }
}
