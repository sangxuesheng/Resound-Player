// localStorage 配额超出时自动回退到 IndexedDB
// 专为大块数据（如 ncm_login_cookie）设计，避免撑爆 5MB 配额

const DB_NAME = 'gemini_music';
const DB_VERSION = 1;
const STORE_NAME = 'large_items';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };
    });
  }
  return dbPromise;
}

async function idbSetItem(key: string, value: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGetItem(key: string): Promise<string | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function idbRemoveItem(key: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 保存数据：先试 localStorage，配额不足时自动回退到 IndexedDB */
export async function storageSetItem(key: string, value: string): Promise<void> {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      await idbSetItem(key, value);
    } else {
      throw e;
    }
  }
}

/** 读取数据：尝试 localStorage，未命中则查 IndexedDB */
export async function storageGetItem(key: string): Promise<string | null> {
  const ls = localStorage.getItem(key);
  if (ls !== null) return ls;
  return idbGetItem(key);
}

/** 删除数据：同时清理两个存储 */
export async function storageRemoveItem(key: string): Promise<void> {
  localStorage.removeItem(key);
  try {
    await idbRemoveItem(key);
  } catch {
    // IndexedDB 不可用（如无痕模式）时静默忽略
  }
}