/**
 * Media Cache Utility menggunakan IndexedDB untuk menyimpan file video & gambar berukuran besar
 * secara permanen di browser client tanpa membebani limit 5MB LocalStorage.
 */

const DB_NAME = 'uda_media_storage_db';
const STORE_NAME = 'media_blobs';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function getDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.warn('Gagal membuka IndexedDB untuk media storage:', request.error);
        resolve(null);
      };
    } catch (e) {
      console.warn('IndexedDB tidak didukung pada browser ini:', e);
      resolve(null);
    }
  });

  return dbPromise;
}

/**
 * Menyimpan data media (Base64 atau Blob Data URL) ke IndexedDB
 */
export async function saveMediaToCache(key: string, dataUrl: string): Promise<boolean> {
  if (!key || !dataUrl) return false;
  try {
    const db = await getDB();
    if (!db) return false;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(dataUrl, key);

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Mengambil data media dari IndexedDB
 */
export async function getMediaFromCache(key: string): Promise<string | null> {
  if (!key) return null;
  try {
    const db = await getDB();
    if (!db) return null;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => resolve((req.result as string) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Menghapus media dari IndexedDB
 */
export async function deleteMediaFromCache(key: string): Promise<boolean> {
  if (!key) return false;
  try {
    const db = await getDB();
    if (!db) return false;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
