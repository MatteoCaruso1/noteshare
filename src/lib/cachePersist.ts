/**
 * Persists the React Query cache to IndexedDB so cached data
 * survives page refreshes when offline.
 *
 * Uses idb-keyval for simplicity. Only caches serializable query data.
 */
import { get, set } from 'idb-keyval';
import type { QueryClient } from '@tanstack/react-query';

const CACHE_KEY = 'noteshare_rq_cache';
const CACHE_VERSION = 1;
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface PersistedCache {
  version: number;
  timestamp: number;
  queries: Array<{
    queryKey: unknown[];
    data: unknown;
    dataUpdatedAt: number;
  }>;
}

/** Query keys worth persisting offline. */
const PERSISTABLE_PREFIXES = ['notes', 'sessions', 'active-session', 'practice-stats', 'weekly-goals', 'goals', 'daily-focus', 'projects'];

function shouldPersist(queryKey: readonly unknown[]): boolean {
  const first = queryKey[0];
  if (typeof first !== 'string') return false;
  return PERSISTABLE_PREFIXES.some(p => first === p || first.startsWith(p));
}

export async function persistQueryCache(queryClient: QueryClient): Promise<void> {
  try {
    const queryCache = queryClient.getQueryCache();
    const queries = queryCache.getAll()
      .filter(q => q.state.status === 'success' && shouldPersist(q.queryKey))
      .map(q => ({
        queryKey: q.queryKey as unknown[],
        data: q.state.data,
        dataUpdatedAt: q.state.dataUpdatedAt,
      }));

    const persisted: PersistedCache = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      queries,
    };

    await set(CACHE_KEY, persisted);
  } catch (err) {
    console.warn('[cachePerist] Failed to persist cache:', err);
  }
}

export async function restoreQueryCache(queryClient: QueryClient): Promise<number> {
  try {
    const persisted = await get<PersistedCache>(CACHE_KEY);
    if (!persisted || persisted.version !== CACHE_VERSION) return 0;

    // Skip if too old
    if (Date.now() - persisted.timestamp > MAX_AGE_MS) return 0;

    let restored = 0;
    for (const { queryKey, data, dataUpdatedAt } of persisted.queries) {
      // Only restore if the cache doesn't already have fresh data
      const existing = queryClient.getQueryData(queryKey);
      if (!existing) {
        queryClient.setQueryData(queryKey, data, { updatedAt: dataUpdatedAt });
        restored++;
      }
    }

    return restored;
  } catch (err) {
    console.warn('[cachePersist] Failed to restore cache:', err);
    return 0;
  }
}
