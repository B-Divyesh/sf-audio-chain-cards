import type { ChainCard } from './types';

const REAL_DB_NAME = 'chain-cards-local';
const REAL_STORE_NAME = 'cards';
const DEMO_STORAGE_KEY = 'demo:chain-cards';
const VERSION = 1;

export interface CardStore {
  all(): Promise<ChainCard[]>;
  get(id: string): Promise<ChainCard | undefined>;
  put(card: ChainCard): Promise<unknown>;
  delete(id: string): Promise<unknown>;
  clear?(): Promise<void>;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(REAL_DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(REAL_STORE_NAME)) {
        db.createObjectStore(REAL_STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local storage.'));
  });
}

async function request<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(REAL_STORE_NAME, mode);
    const operation = action(transaction.objectStore(REAL_STORE_NAME));
    operation.onsuccess = () => resolve(operation.result);
    operation.onerror = () => reject(operation.error ?? new Error('Local storage operation failed.'));
    transaction.oncomplete = () => db.close();
  });
}

export const realCardDb: CardStore = {
  all: () => request<ChainCard[]>('readonly', (store) => store.getAll()),
  get: (id: string) => request<ChainCard | undefined>('readonly', (store) => store.get(id)),
  put: (card: ChainCard) => request<IDBValidKey>('readwrite', (store) => store.put(card)),
  delete: (id: string) => request<undefined>('readwrite', (store) => store.delete(id) as IDBRequest<undefined>),
  clear: async () => { await request<undefined>('readwrite', (store) => store.clear() as IDBRequest<undefined>); }
};

function readDemoCards(): ChainCard[] {
  try {
    const saved = sessionStorage.getItem(DEMO_STORAGE_KEY);
    return saved ? JSON.parse(saved) as ChainCard[] : [];
  } catch {
    return [];
  }
}

function writeDemoCards(cards: ChainCard[]): void {
  sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(cards));
}

export const demoCardDb: CardStore = {
  all: async () => structuredClone(readDemoCards()),
  get: async (id: string) => structuredClone(readDemoCards().find((card) => card.id === id)),
  put: async (card: ChainCard) => {
    const cards = readDemoCards();
    const index = cards.findIndex((item) => item.id === card.id);
    if (index === -1) cards.push(structuredClone(card));
    else cards[index] = structuredClone(card);
    writeDemoCards(cards);
    return card.id;
  },
  delete: async (id: string) => {
    writeDemoCards(readDemoCards().filter((card) => card.id !== id));
  },
  clear: async () => { sessionStorage.removeItem(DEMO_STORAGE_KEY); }
};

export const isDemoPath = (path = location.pathname): boolean => path === '/demo' || path.startsWith('/demo/');

export const activeCardDb = (): CardStore => isDemoPath() ? demoCardDb : realCardDb;
