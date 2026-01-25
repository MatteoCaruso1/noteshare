/**
 * Persistent cache for signed URLs using IndexedDB
 * Survives page reloads and tab switches
 */

const DB_NAME = 'noteshare-url-cache';
const DB_VERSION = 1;
const STORE_NAME = 'signed-urls';
const MAX_CACHE_SIZE = 200;

interface CachedEntry {
  path: string;           // Original storage path (primary key)
  signedUrl: string;      // The signed URL
  expiresAt: number;      // Timestamp when URL expires
  priority: 'avatar' | 'media';  // For LRU eviction priority
  accessedAt: number;     // Last access time for LRU
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.warn('[PersistentCache] Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'path' });
        store.createIndex('expiresAt', 'expiresAt');
        store.createIndex('accessedAt', 'accessedAt');
        store.createIndex('priority', 'priority');
      }
    };
  });

  return dbPromise;
}

/**
 * Get a cached signed URL if it exists and is not expired
 */
export async function getCachedUrl(path: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(path);

      request.onsuccess = () => {
        const entry = request.result as CachedEntry | undefined;
        if (!entry) {
          resolve(null);
          return;
        }

        // Check if expired (with 5-minute buffer)
        if (entry.expiresAt < Date.now() + 5 * 60 * 1000) {
          // Delete expired entry
          store.delete(path);
          resolve(null);
          return;
        }

        // Update access time for LRU
        entry.accessedAt = Date.now();
        store.put(entry);

        resolve(entry.signedUrl);
      };

      request.onerror = () => {
        console.warn('[PersistentCache] Failed to get cached URL:', request.error);
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

/**
 * Get multiple cached URLs at once
 */
export async function getCachedUrls(paths: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const now = Date.now();
      let pending = paths.length;

      if (pending === 0) {
        resolve(results);
        return;
      }

      for (const path of paths) {
        const request = store.get(path);
        request.onsuccess = () => {
          const entry = request.result as CachedEntry | undefined;
          if (entry && entry.expiresAt > now + 5 * 60 * 1000) {
            results.set(path, entry.signedUrl);
            // Update access time
            entry.accessedAt = now;
            store.put(entry);
          } else if (entry) {
            // Delete expired entry
            store.delete(path);
          }
          pending--;
          if (pending === 0) resolve(results);
        };
        request.onerror = () => {
          pending--;
          if (pending === 0) resolve(results);
        };
      }
    });
  } catch {
    return results;
  }
}

/**
 * Cache a signed URL
 */
export async function setCachedUrl(
  path: string,
  signedUrl: string,
  expiresAt: number,
  priority: 'avatar' | 'media' = 'media'
): Promise<void> {
  try {
    const db = await openDB();
    const entry: CachedEntry = {
      path,
      signedUrl,
      expiresAt,
      priority,
      accessedAt: Date.now(),
    };

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Silently fail - caching is best-effort
  }
}

/**
 * Cache multiple signed URLs at once
 */
export async function setCachedUrls(
  entries: Array<{ path: string; signedUrl: string; expiresAt: number; priority?: 'avatar' | 'media' }>
): Promise<void> {
  if (entries.length === 0) return;

  try {
    const db = await openDB();
    const now = Date.now();

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      for (const { path, signedUrl, expiresAt, priority = 'media' } of entries) {
        store.put({
          path,
          signedUrl,
          expiresAt,
          priority,
          accessedAt: now,
        } as CachedEntry);
      }

      tx.oncomplete = () => {
        // After adding, check cache size and evict if needed
        evictIfNeeded();
        resolve();
      };
      tx.onerror = () => resolve();
    });
  } catch {
    // Silently fail
  }
}

/**
 * Evict old entries if cache is too large
 * Prioritizes keeping avatars and recently accessed items
 */
async function evictIfNeeded(): Promise<void> {
  try {
    const db = await openDB();
    
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const countRequest = store.count();

      countRequest.onsuccess = () => {
        const count = countRequest.result;
        if (count <= MAX_CACHE_SIZE) {
          resolve();
          return;
        }

        // Need to evict: delete oldest non-avatar entries first
        const toDelete = count - MAX_CACHE_SIZE + 20; // Delete 20 extra to avoid frequent eviction
        const accessedIndex = store.index('accessedAt');
        const cursor = accessedIndex.openCursor();
        let deleted = 0;

        cursor.onsuccess = () => {
          const c = cursor.result;
          if (c && deleted < toDelete) {
            const entry = c.value as CachedEntry;
            // Skip avatars during first pass
            if (entry.priority !== 'avatar') {
              store.delete(entry.path);
              deleted++;
            }
            c.continue();
          } else {
            resolve();
          }
        };
      };
    });
  } catch {
    // Silently fail
  }
}

/**
 * Clear all cached URLs (call on sign-out)
 */
export async function clearPersistentCache(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Silently fail
  }
}

/**
 * Delete expired entries (can be called periodically)
 */
export async function cleanupExpiredEntries(): Promise<void> {
  try {
    const db = await openDB();
    const now = Date.now();

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const expiresIndex = store.index('expiresAt');
      const range = IDBKeyRange.upperBound(now);
      const cursor = expiresIndex.openCursor(range);

      cursor.onsuccess = () => {
        const c = cursor.result;
        if (c) {
          store.delete(c.primaryKey);
          c.continue();
        } else {
          resolve();
        }
      };

      cursor.onerror = () => resolve();
    });
  } catch {
    // Silently fail
  }
}
