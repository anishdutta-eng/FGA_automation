import { openDB, type IDBPDatabase } from 'idb';

/**
 * Minimal IndexedDB wrapper for offline persistence.
 *
 * We keep a single serialized snapshot of the inspection under one key. Photo
 * `File` objects are stored inline via IndexedDB's structured clone (which
 * supports File/Blob), so no separate blob store is needed. Only the ephemeral
 * object-URL is stripped before saving and regenerated on load.
 */

const DB_NAME = 'fga-inspection';
const DB_VERSION = 1;
const STORE = 'state';
const KEY = 'current';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      },
    });
  }
  return dbPromise;
}

export async function saveState(value: unknown): Promise<void> {
  const db = await getDb();
  await db.put(STORE, value, KEY);
}

export async function loadState<T>(): Promise<T | undefined> {
  const db = await getDb();
  return (await db.get(STORE, KEY)) as T | undefined;
}

export async function clearState(): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, KEY);
}
