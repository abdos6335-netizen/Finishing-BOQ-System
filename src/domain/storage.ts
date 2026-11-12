import { loadProjects, type ProjectRecord } from "./project-store";

/**
 * Async project storage. IndexedDB is the production backend; an in-memory
 * backend is used in tests. Both store plain JSON-compatible records.
 */
export interface ProjectStorage {
  loadAll(): Promise<ProjectRecord[]>;
  save(project: ProjectRecord): Promise<void>;
  saveMany(projects: ProjectRecord[]): Promise<void>;
  remove(id: string): Promise<void>;
}

export class MemoryProjectStorage implements ProjectStorage {
  private readonly records = new Map<string, string>();
  async loadAll(): Promise<ProjectRecord[]> { return [...this.records.values()].map(v => JSON.parse(v) as ProjectRecord); }
  async save(project: ProjectRecord): Promise<void> { this.records.set(project.id, JSON.stringify(project)); }
  async saveMany(projects: ProjectRecord[]): Promise<void> { for (const p of projects) await this.save(p); }
  async remove(id: string): Promise<void> { this.records.delete(id); }
}

const DB_NAME = "finishing-boq";
const DB_VERSION = 1;
const STORE = "projects";

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed."));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted."));
  });
}

export class IndexedDbProjectStorage implements ProjectStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;
  constructor(private readonly factory: IDBFactory = globalThis.indexedDB, private readonly dbName = DB_NAME) {
    if (!factory) throw new Error("IndexedDB is not available in this environment.");
  }
  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const open = this.factory.open(this.dbName, DB_VERSION);
        open.onupgradeneeded = () => {
          if (!open.result.objectStoreNames.contains(STORE)) open.result.createObjectStore(STORE, { keyPath: "id" });
        };
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error ?? new Error("Could not open IndexedDB."));
      });
    }
    return this.dbPromise;
  }
  async loadAll(): Promise<ProjectRecord[]> {
    const db = await this.db();
    return request(db.transaction(STORE, "readonly").objectStore(STORE).getAll()) as Promise<ProjectRecord[]>;
  }
  async save(project: ProjectRecord): Promise<void> { await this.saveMany([project]); }
  async saveMany(projects: ProjectRecord[]): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(STORE, "readwrite");
    for (const project of projects) tx.objectStore(STORE).put(JSON.parse(JSON.stringify(project)));
    await transactionDone(tx);
  }
  async remove(id: string): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    await transactionDone(tx);
  }
  close(): void { void this.dbPromise?.then(db => db.close()); this.dbPromise = null; }
}

const MIGRATION_FLAG = "finishing-boq.migrated-to-indexeddb.v1";

/**
 * One-time copy of legacy localStorage projects into the new storage. Existing
 * records in the new storage are never overwritten, and the legacy data is left
 * in place (not deleted) so a failed migration loses nothing.
 */
export async function migrateFromLocalStorage(target: ProjectStorage, flagStore: Pick<Storage, "getItem" | "setItem"> = localStorage): Promise<{ migrated: number; skipped: number }> {
  if (flagStore.getItem(MIGRATION_FLAG) === "done") return { migrated: 0, skipped: 0 };
  const legacy = loadProjects();
  const existing = new Set((await target.loadAll()).map(p => p.id));
  const toCopy = legacy.filter(p => !existing.has(p.id));
  await target.saveMany(toCopy);
  flagStore.setItem(MIGRATION_FLAG, "done");
  return { migrated: toCopy.length, skipped: legacy.length - toCopy.length };
}
