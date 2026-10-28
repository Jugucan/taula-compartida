// Base de dades simulada en memòria, amb només el que fa servir el servidor dels convidats.
type Data = Record<string, unknown>;

export function createFakeDb() {
  const store = new Map<string, Data>();
  const ref = (path: string) => ({
    path,
    async get() {
      const d = store.get(path);
      return { exists: d !== undefined, data: () => (d === undefined ? undefined : structuredClone(d)) };
    },
  });
  type Ref = ReturnType<typeof ref>;
  return {
    store,
    doc: ref,
    async runTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
      const writes: (() => void)[] = [];
      const tx = {
        get: (r: Ref) => r.get(),
        create: (r: Ref, d: Data) => writes.push(() => { if (store.has(r.path)) throw new Error("ALREADY_EXISTS"); store.set(r.path, structuredClone(d)); }),
        update: (r: Ref, d: Data) => writes.push(() => { if (!store.has(r.path)) throw new Error("NOT_FOUND"); store.set(r.path, { ...store.get(r.path), ...structuredClone(d) }); }),
      };
      const result = await fn(tx);
      writes.forEach((w) => w()); // les escriptures s'apliquen totes alhora, al final
      return result;
    },
  };
}
