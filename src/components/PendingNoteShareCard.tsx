import { PendingNoteShare, useRespondToNoteShare } from '@/hooks/useNoteShares';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClickableAvatar } from '@/components/ClickableAvatar';
import { Users, Check, X, Clock, Music } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface PendingNoteShareCardProps {
  share: PendingNoteShare;
}

export function PendingNoteShareCard({ share }: PendingNoteShareCardProps) {
  const respondToShare = useRespondToNoteShare();

  const handleAccept = () => {
    respondToShare.mutate({ shareId: share.id, status: 'accepted' });
  };

  const handleReject = () => {
    respondToShare.mutate({ shareId: share.id, status: 'rejected' });
  };

  // Calculate session duration if available
  const getSessionDuration = () => {
    const session = share.note?.session;
    if (!session?.started_at || !session?.ended_at) return null;
    
    const startMs = new Date(session.started_at).getTime();
    const endMs = new Date(session.ended_at).getTime();
    const pausedMs = session.paused_duration_ms || 0;
    const durationMs = endMs - startMs - pausedMs;
    const minutes = Math.floor(durationMs / 60000);
    
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const sessionDuration = getSessionDuration();

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-start gap-3">
        <ClickableAvatar
          profileId={share.shared_by.id}
          avatar={share.shared_by.avatar}
          name={share.shared_by.name}
          size="md"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-sm">{share.shared_by.name}</span>
            <span className="text-muted-foreground text-sm">practiced with you</span>
          </div>
          
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDistanceToNow(new Date(share.created_at), { addSuffix: true })}
          </p>
          
          {/* Session info */}
          <div className="mt-2 p-2 bg-muted/50 rounded-md space-y-1.5">
            {sessionDuration && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>{sessionDuration} session</span>
              </div>
            )}
            
            {share.note?.text_content && (
              <p className="text-sm line-clamp-2">{share.note.text_content}</p>
            )}
            
            {(share.note?.audio_files?.length || 0) > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Music className="w-3.5 h-3.5" />
                <span>{share.note.audio_files?.length} audio clip{(share.note.audio_files?.length || 0) > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            Add this to your timeline?
          </p>
          
          {/* Action buttons */}
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant="default"
              className="gap-1.5"
              onClick={handleAccept}
              disabled={respondToShare.isPending}
            >
              <Check className="w-3.5 h-3.5" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleReject}
              disabled={respondToShare.isPending}
            >
              <X className="w-3.5 h-3.5" />
              Decline
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
