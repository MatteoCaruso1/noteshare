/**
 * SyncManager: invisible component that listens for online/offline events,
 * processes the offline queue on reconnect, and periodically persists
 * the React Query cache to IndexedDB.
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { processOfflineQueue } from '@/lib/offlineSync';
import { getQueueSize } from '@/lib/offlineQueue';
import { persistQueryCache, restoreQueryCache } from '@/lib/cachePersist';
import { toast } from 'sonner';

export type SyncState = 'idle' | 'syncing' | 'offline';

interface SyncManagerProps {
  onStateChange?: (state: SyncState) => void;
}

export function SyncManager({ onStateChange }: SyncManagerProps) {
  const isOnline = useNetworkStatus();
  const queryClient = useQueryClient();
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const hasRestoredCache = useRef(false);
  const persistInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update parent about state changes
  useEffect(() => {
    onStateChange?.(syncState);
  }, [syncState, onStateChange]);

  // Restore cache from IndexedDB on mount
  useEffect(() => {
    if (hasRestoredCache.current) return;
    hasRestoredCache.current = true;

    restoreQueryCache(queryClient).then(count => {
      if (count > 0) {
        console.log(`[SyncManager] Restored ${count} queries from IndexedDB cache`);
      }
    });
  }, [queryClient]);

  // Periodically persist cache (every 30 seconds when online, every 10 seconds when offline)
  useEffect(() => {
    const intervalMs = isOnline ? 30_000 : 10_000;

    persistInterval.current = setInterval(() => {
      persistQueryCache(queryClient);
    }, intervalMs);

    return () => {
      if (persistInterval.current) clearInterval(persistInterval.current);
    };
  }, [isOnline, queryClient]);

  // Also persist on visibility change (user switching tabs / closing app)
  useEffect(() => {
    const handleVisChange = () => {
      if (document.visibilityState === 'hidden') {
        persistQueryCache(queryClient);
      }
    };
    document.addEventListener('visibilitychange', handleVisChange);
    return () => document.removeEventListener('visibilitychange', handleVisChange);
  }, [queryClient]);

  // Process offline queue when coming back online
  const processQueue = useCallback(async () => {
    const size = await getQueueSize();
    if (size === 0) return;

    setSyncState('syncing');
    console.log(`[SyncManager] Processing ${size} queued operations...`);

    const result = await processOfflineQueue((progress) => {
      // Keep syncing state while processing
    });

    if (result.completed > 0) {
      toast.success(`Synced ${result.completed} offline change${result.completed > 1 ? 's' : ''}`);
      // Refresh data from server
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['active-session'] });
      queryClient.invalidateQueries({ queryKey: ['practice-stats'] });
    }

    if (result.failed > 0) {
      toast.error(`${result.failed} change${result.failed > 1 ? 's' : ''} failed to sync`);
    }

    setSyncState('idle');
  }, [queryClient]);

  // Track online/offline transitions
  useEffect(() => {
    if (isOnline) {
      processQueue();
    } else {
      setSyncState('offline');
    }
  }, [isOnline, processQueue]);

  return null;
}
