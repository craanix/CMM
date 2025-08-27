import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface SyncRecord {
  id?: number;
  url: string;
  method: string;
  body: any;
  headers: Record<string, string>;
  timestamp: number;
}

interface CMMDB extends DBSchema {
  keyval: {
    key: string;
    value: any;
  };
  'sync-queue': {
    key: number;
    value: SyncRecord;
    indexes: { 'timestamp': number };
  };
}

let dbPromise: Promise<IDBPDatabase<CMMDB>>;

const getDb = (): Promise<IDBPDatabase<CMMDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<CMMDB>('cmm-db', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
            db.createObjectStore('keyval');
        }
        if (oldVersion < 2) {
            const syncStore = db.createObjectStore('sync-queue', { autoIncrement: true, keyPath: 'id' });
            syncStore.createIndex('timestamp', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
}

export const getCachedData = async <T>(key: string): Promise<T | undefined> => {
  const db = await getDb();
  return db.get('keyval', key);
};

export const setCachedData = async <T>(key: string, data: T): Promise<string> => {
  const db = await getDb();
  return db.put('keyval', data, key);
};

export const queueRequest = async (request: Omit<SyncRecord, 'timestamp' | 'id'>) => {
    const db = await getDb();
    await db.add('sync-queue', {
        ...request,
        timestamp: Date.now()
    });
};
