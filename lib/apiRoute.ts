/** Tipo di secondo argomento dei Route Handler dinamici Next.js, es. `RouteParams<{ id: string }>`. */
export type RouteParams<T extends Record<string, string>> = { params: Promise<T> };

/** "Trova per id o 404": pattern ripetuto in ogni Route Handler che opera su una risorsa esistente.
 * Torna il record se trovato, altrimenti una 404 pronta da restituire dal chiamante. */
export async function findOrNotFound<T>(
  find: () => Promise<T | null>,
  message: string,
): Promise<{ record: T; notFound: null } | { record: null; notFound: Response }> {
  const record = await find();
  if (!record) return { record: null, notFound: Response.json({ error: message }, { status: 404 }) };
  return { record, notFound: null };
}
