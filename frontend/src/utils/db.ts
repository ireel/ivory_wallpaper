const DB_NAME = 'ivory_wallpaper_assets';
const DB_VERSION = 1;
const STORE_NAME = 'files';
const CUSTOM_BG_KEY = 'custom-background';

function openAssetDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
  });
}

export async function idbSet(key: string, value: any): Promise<void> {
  const db = await openAssetDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB put failed'));
  });
}

export async function idbGet(key: string): Promise<any> {
  const db = await openAssetDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error || new Error('IndexedDB get failed'));
  });
}

export async function idbDelete(key: string): Promise<void> {
  const db = await openAssetDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB delete failed'));
  });
}

export async function saveCustomBackgroundBlob(blob: Blob): Promise<void> {
  await idbSet(CUSTOM_BG_KEY, blob);
}

export async function loadCustomBackgroundBlob(): Promise<Blob | null> {
  try {
    return await idbGet(CUSTOM_BG_KEY);
  } catch (err) {
    console.warn('Failed to load custom background blob from IndexedDB:', err);
    return null;
  }
}

export async function deleteCustomBackgroundBlob(): Promise<void> {
  await idbDelete(CUSTOM_BG_KEY);
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('blobToDataUrl failed'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',', 2);
  if (!head || !body) {
    throw new Error('Invalid data URL');
  }
  const mime = /data:(.*?);base64/.exec(head)?.[1] || 'application/octet-stream';
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}
