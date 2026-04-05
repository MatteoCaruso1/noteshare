/**
 * Lightweight offline sync queue backed by IndexedDB (via idb-keyval).
 *
 * Each entry stores a mutation type + payload. When the app reconnects,
 * the SyncManager processes entries in order with exponential backoff.
 */
import { get, set, del, keys } from 'idb-keyval';

export type OfflineMutationType =
  | 'start_session'
  | 'end_session'
  | 'pause_session'
  | 'resume_session'
  | 'create_note'
  | 'log_offline_session';

export interface OfflineQueueEntry {
  id: string;              // unique key (also used as IDB key)
  type: OfflineMutationType;
  payload: Record<string, any>;
  createdAt: string;       // ISO timestamp
  retries: number;
  /** Maps local optimistic IDs to server IDs after sync */
  idMappings?: Record<string, string>;
}

const QUEUE_PREFIX = 'offline_q_';

function queueKey(id: string) {
  return `${QUEUE_PREFIX}${id}`;
}

export async function enqueue(entry: Omit<OfflineQueueEntry, 'id' | 'createdAt' | 'retries'>): Promise<OfflineQueueEntry> {
  const full: OfflineQueueEntry = {
    ...entry,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    retries: 0,
  };
  await set(queueKey(full.id), full);
  return full;
}

export async function getQueue(): Promise<OfflineQueueEntry[]> {
  const allKeys = await keys();
  const queueKeys = (allKeys as string[]).filter(k => typeof k === 'string' && k.startsWith(QUEUE_PREFIX));

  if (queueKeys.length === 0) return [];

  const entries = await Promise.all(queueKeys.map(k => get<OfflineQueueEntry>(k)));
  return entries
    .filter((e): e is OfflineQueueEntry => !!e)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getQueueSize(): Promise<number> {
  const allKeys = await keys();
  return (allKeys as string[]).filter(k => typeof k === 'string' && k.startsWith(QUEUE_PREFIX)).length;
}

export async function removeEntry(id: string): Promise<void> {
  await del(queueKey(id));
}

export async function updateEntry(entry: OfflineQueueEntry): Promise<void> {
  await set(queueKey(entry.id), entry);
}

export async function clearQueue(): Promise<void> {
  const allKeys = await keys();
  const queueKeys = (allKeys as string[]).filter(k => typeof k === 'string' && k.startsWith(QUEUE_PREFIX));
  await Promise.all(queueKeys.map(k => del(k)));
}
