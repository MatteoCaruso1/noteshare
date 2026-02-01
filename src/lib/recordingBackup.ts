/**
 * IndexedDB-based recording backup system
 * Ensures audio recordings are never lost by persisting blobs locally
 * before upload attempts.
 */

const DB_NAME = 'noteshare_recordings';
const DB_VERSION = 1;
const STORE_NAME = 'pending_recordings';

export interface RecordingBackup {
  id: string;
  blob: Blob;
  duration: number;
  createdAt: number;
  userId: string;
  status: 'pending' | 'uploading' | 'failed';
  mimeType: string;
  sizeBytes: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[RecordingBackup] Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });

  return dbPromise;
}

/**
 * Generate a unique ID for a recording backup
 */
export function generateBackupId(): string {
  return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Save a recording blob to IndexedDB as a backup
 */
export async function saveRecordingBackup(
  id: string,
  blob: Blob,
  duration: number,
  userId: string
): Promise<void> {
  try {
    const db = await getDB();
    const backup: RecordingBackup = {
      id,
      blob,
      duration,
      createdAt: Date.now(),
      userId,
      status: 'pending',
      mimeType: blob.type,
      sizeBytes: blob.size,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(backup);

      request.onsuccess = () => {
        console.log(`[RecordingBackup] Saved backup ${id}, size: ${formatBytes(blob.size)}`);
        resolve();
      };

      request.onerror = () => {
        console.error('[RecordingBackup] Failed to save backup:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[RecordingBackup] Error saving backup:', error);
    throw error;
  }
}

/**
 * Update the status of a backup
 */
export async function updateBackupStatus(
  id: string,
  status: RecordingBackup['status']
): Promise<void> {
  try {
    const db = await getDB();
    const backup = await getBackup(id);
    if (!backup) return;

    backup.status = status;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(backup);

      request.onsuccess = () => {
        console.log(`[RecordingBackup] Updated backup ${id} status to ${status}`);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[RecordingBackup] Error updating status:', error);
    throw error;
  }
}

/**
 * Get a single backup by ID
 */
export async function getBackup(id: string): Promise<RecordingBackup | null> {
  try {
    const db = await getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[RecordingBackup] Error getting backup:', error);
    return null;
  }
}

/**
 * Get all pending backups for a user (recordings that weren't successfully uploaded)
 */
export async function getPendingBackups(userId?: string): Promise<RecordingBackup[]> {
  try {
    const db = await getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        let backups = request.result as RecordingBackup[];
        
        // Filter by userId if provided
        if (userId) {
          backups = backups.filter(b => b.userId === userId);
        }
        
        // Filter for pending or failed (not yet successfully uploaded)
        backups = backups.filter(b => b.status === 'pending' || b.status === 'failed');
        
        // Sort by createdAt descending (newest first)
        backups.sort((a, b) => b.createdAt - a.createdAt);
        
        resolve(backups);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[RecordingBackup] Error getting pending backups:', error);
    return [];
  }
}

/**
 * Clear a backup after successful upload
 */
export async function clearBackup(id: string): Promise<void> {
  try {
    const db = await getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log(`[RecordingBackup] Cleared backup ${id}`);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[RecordingBackup] Error clearing backup:', error);
    throw error;
  }
}

/**
 * Clear all backups for a user
 */
export async function clearAllBackups(userId: string): Promise<void> {
  try {
    const backups = await getPendingBackups(userId);
    for (const backup of backups) {
      await clearBackup(backup.id);
    }
  } catch (error) {
    console.error('[RecordingBackup] Error clearing all backups:', error);
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}
