import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { WifiOff, RefreshCw } from 'lucide-react';
import type { SyncState } from '@/components/SyncManager';

interface OfflineBannerProps {
  syncState: SyncState;
}

export function OfflineBanner({ syncState }: OfflineBannerProps) {
  const isOnline = useNetworkStatus();

  if (isOnline && syncState === 'idle') return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 px-4 text-xs font-medium transition-all duration-300"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6px)',
        paddingBottom: '6px',
      style={{
        background: syncState === 'syncing'
          ? 'hsl(var(--primary) / 0.9)'
          : 'hsl(var(--destructive) / 0.85)',
        color: syncState === 'syncing'
          ? 'hsl(var(--primary-foreground))'
          : 'hsl(var(--destructive-foreground))',
        backdropFilter: 'blur(8px)',
      }}
    >
      {syncState === 'syncing' ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Syncing offline changes…</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline mode — your work is saved locally</span>
        </>
      )}
    </div>
  );
}
