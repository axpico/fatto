import type { Prisma } from "@/lib/generated/prisma/client";

/** Campi utente esposti dalle API (mai passwordHash). */
export const userSelect = { id: true, email: true, name: true, isAdmin: true, createdAt: true } as const;

/** Come arriva al client: createdAt è serializzato in JSON. */
export type UserSummary = Omit<Prisma.UserGetPayload<{ select: typeof userSelect }>, "createdAt"> & { createdAt: string };
