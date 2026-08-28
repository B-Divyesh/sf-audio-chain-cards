import type { ChainCard } from './types';

const DB_NAME = 'chain-cards-local';
const STORE_NAME = 'cards';
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local storage.'));
  });
}

async function request<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const operation = action(transaction.objectStore(STORE_NAME));
    operation.onsuccess = () => resolve(operation.result);
    operation.onerror = () => reject(operation.error ?? new Error('Local storage operation failed.'));
    transaction.oncomplete = () => db.close();
  });
}

export const cardDb = {
  all: () => request<ChainCard[]>('readonly', (store) => store.getAll()),
  get: (id: string) => request<ChainCard | undefined>('readonly', (store) => store.get(id)),
  put: (card: ChainCard) => request<IDBValidKey>('readwrite', (store) => store.put(card)),
  delete: (id: string) => request<undefined>('readwrite', (store) => store.delete(id) as IDBRequest<undefined>)
};
