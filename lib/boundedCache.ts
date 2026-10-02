// ponytail: eviction per ordine di inserimento (non LRU), single-instance, in memoria — sufficiente
// a mettere un tetto alla crescita per un deploy single-container; upgrade a LRU/store condiviso
// solo se la mancanza di località di accesso diventa un problema reale.
export class BoundedMap<K, V> {
  private map = new Map<K, V>();

  constructor(private maxEntries: number) {}

  get(key: K): V | undefined {
    return this.map.get(key);
  }

  delete(key: K): void {
    this.map.delete(key);
  }

  set(key: K, value: V): void {
    this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
  }
}
