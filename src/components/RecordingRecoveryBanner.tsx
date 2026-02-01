import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { 
  getPendingBackups, 
  clearBackup, 
  updateBackupStatus,
  formatBytes,
  type RecordingBackup 
} from '@/lib/recordingBackup';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Upload, X, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface RecoveryState {
  isRecovering: boolean;
  currentId: string | null;
  progress: number;
}

export function RecordingRecoveryBanner() {
  const { profile } = useAuth();
  const { uploadAudioWithProgress } = useMediaUpload();
  const [pendingBackups, setPendingBackups] = useState<RecordingBackup[]>([]);
  const [recoveryState, setRecoveryState] = useState<RecoveryState>({
    isRecovering: false,
    currentId: null,
    progress: 0,
  });
  const [dismissed, setDismissed] = useState(false);

  // Check for pending backups on mount
  useEffect(() => {
    if (!profile?.id) return;

    const checkBackups = async () => {
      const backups = await getPendingBackups(profile.id);
      setPendingBackups(backups);
    };

    checkBackups();
  }, [profile?.id]);

  const handleRecover = async (backup: RecordingBackup) => {
    if (!profile?.id) return;

    setRecoveryState({ isRecovering: true, currentId: backup.id, progress: 0 });

    try {
      // Mark as uploading
      await updateBackupStatus(backup.id, 'uploading');

      // Upload with progress tracking
      const url = await uploadAudioWithProgress(
        backup.blob,
        profile.id,
        (progress) => {
          setRecoveryState(prev => ({ ...prev, progress }));
        }
      );

      if (url) {
        // Success! Clear the backup
        await clearBackup(backup.id);
        setPendingBackups(prev => prev.filter(b => b.id !== backup.id));
        
        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-primary" />
            <span>Recording recovered and saved!</span>
          </div>
        );
      } else {
        await updateBackupStatus(backup.id, 'failed');
        toast.error('Failed to recover recording. Please try again.');
      }
    } catch (error) {
      console.error('[RecoveryBanner] Recovery failed:', error);
      await updateBackupStatus(backup.id, 'failed');
      toast.error('Failed to recover recording. Please try again.');
    } finally {
      setRecoveryState({ isRecovering: false, currentId: null, progress: 0 });
    }
  };

  const handleDiscard = async (backup: RecordingBackup) => {
    await clearBackup(backup.id);
    setPendingBackups(prev => prev.filter(b => b.id !== backup.id));
    toast.success('Recording discarded');
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  // Don't show if no pending backups or dismissed
  if (pendingBackups.length === 0 || dismissed) {
    return null;
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="bg-destructive/10 border-destructive/30 p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-destructive">Unsaved Recording Found</h3>
              <p className="text-sm text-muted-foreground">
                {pendingBackups.length === 1
                  ? 'A recording was not saved. Would you like to recover it?'
                  : `${pendingBackups.length} recordings were not saved. Would you like to recover them?`}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1 -mr-1"
              onClick={handleDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {pendingBackups.map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between gap-2 p-2 bg-background/50 rounded-md"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {formatDuration(backup.duration)} recording
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(backup.sizeBytes)} • {formatDate(backup.createdAt)}
                  </p>
                  
                  {/* Progress bar during recovery */}
                  {recoveryState.isRecovering && recoveryState.currentId === backup.id && (
                    <div className="mt-2 space-y-1">
                      <Progress value={recoveryState.progress} className="h-1.5" />
                      <p className="text-xs text-muted-foreground">
                        Uploading... {Math.round(recoveryState.progress)}%
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {recoveryState.isRecovering && recoveryState.currentId === backup.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        className="h-7 gap-1"
                        onClick={() => handleRecover(backup)}
                        disabled={recoveryState.isRecovering}
                      >
                        <Upload className="w-3 h-3" />
                        Recover
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDiscard(backup)}
                        disabled={recoveryState.isRecovering}
                      >
                        Discard
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
