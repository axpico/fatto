// ponytail: contatore in-memory per chiave, single-instance — si azzera al riavvio del container e
// non è condiviso tra repliche. Sufficiente per un'app familiare a singolo processo; se mai
// diventasse multi-istanza, spostare su uno store condiviso (Redis).
type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

function getEntry(key: string, windowMs: number): Entry {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    const fresh = { count: 0, resetAt: now + windowMs };
    store.set(key, fresh);
    return fresh;
  }
  return entry;
}

export function isRateLimited(key: string, max: number, windowMs: number): boolean {
  return getEntry(key, windowMs).count >= max;
}

export function recordAttempt(key: string, windowMs: number): void {
  getEntry(key, windowMs).count += 1;
}

export function clearRateLimit(key: string): void {
  store.delete(key);
}

const IMPORT_RATE_LIMIT = 6;
const IMPORT_RATE_WINDOW_MS = 5 * 60_000;

/** 429 pronta da restituire se l'utente ha superato il limite di importazioni AI, altrimenti registra il tentativo e torna null. */
export function checkImportRateLimit(userId: string): Response | null {
  const key = `import:${userId}`;
  if (isRateLimited(key, IMPORT_RATE_LIMIT, IMPORT_RATE_WINDOW_MS)) {
    return Response.json({ error: "Troppe importazioni, riprova tra qualche minuto." }, { status: 429 });
  }
  recordAttempt(key, IMPORT_RATE_WINDOW_MS);
  return null;
}
