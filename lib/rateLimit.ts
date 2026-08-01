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
