import { useState, useEffect, useCallback } from 'react';

export type NetworkStatus = 'online' | 'offline' | 'syncing';

/** Lightweight hook that tracks navigator.onLine + fires on change. */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return isOnline;
}

/** Returns true when the browser reports offline. */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' ? !navigator.onLine : false;
}
