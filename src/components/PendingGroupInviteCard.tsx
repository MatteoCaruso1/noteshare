import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SignedImage } from '@/components/SignedImage';
import { useAcceptGroupInvite, useDeclineGroupInvite, GroupInvite } from '@/hooks/useGroupInvites';
import { Music, Check, X, Loader2 } from 'lucide-react';
import { useSignedUrl } from '@/hooks/useSignedUrl';

interface PendingGroupInviteCardProps {
  invite: GroupInvite;
}

function GroupAvatar({ coverImage, name }: { coverImage: string | null | undefined; name: string | undefined }) {
  // Handle header: presets (CSS gradients) or missing images
  const isPreset = coverImage?.startsWith('header:');
  const isPublicUrl = coverImage?.startsWith('http');
  const isStoragePath = coverImage && !isPreset && !isPublicUrl;

  const { signedUrl } = useSignedUrl(isStoragePath ? coverImage : undefined);

  const imgSrc = isPublicUrl ? coverImage : isStoragePath ? signedUrl : null;

  if (isPreset || !imgSrc) {
    return (
      <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
        <Music className="w-5 h-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-lg border border-border overflow-hidden shrink-0">
      <img src={imgSrc} alt={name || 'Group'} className="w-full h-full object-cover" />
    </div>
  );
}

export function PendingGroupInviteCard({ invite }: PendingGroupInviteCardProps) {
  const navigate = useNavigate();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [handled, setHandled] = useState(false);
  
  const acceptInvite = useAcceptGroupInvite({
    onSuccessNavigate: () => {
      navigate('/groups?tab=my');
    }
  });
  const declineInvite = useDeclineGroupInvite();

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await acceptInvite.mutateAsync({ 
        inviteId: invite.id, 
        groupId: invite.group_id 
      });
      setHandled(true);
    } catch {
      // Error toast is handled by the hook
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      await declineInvite.mutateAsync(invite.id);
      setHandled(true);
    } catch {
      // Error toast is handled by the hook
    } finally {
      setIsDeclining(false);
    }
  };

  // Hide once handled (optimistic removal before query invalidation catches up)
  if (handled) return null;

  return (
    <Card className="p-3 bg-primary/5 border-primary/20">
      <div className="flex items-start gap-3">
        <GroupAvatar coverImage={invite.group?.cover_image} name={invite.group?.name} />

        <div className="flex-1 min-w-0">
          <p className="text-sm">
            <span className="font-medium">{invite.inviter?.name}</span>
            <span className="text-muted-foreground"> invited you to join</span>
          </p>
          <p className="font-medium text-sm truncate">{invite.group?.name}</p>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <Button
          variant="default"
          size="sm"
          className="flex-1 gap-1 touch-manipulation"
          data-no-hover-reset
          onClick={handleAccept}
          onTouchEnd={(e) => e.currentTarget.blur()}
          disabled={isAccepting || isDeclining}
        >
          {isAccepting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Check className="w-3 h-3" />
          )}
          Accept
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1 touch-manipulation"
          data-no-hover-reset
          onClick={handleDecline}
          onTouchEnd={(e) => e.currentTarget.blur()}
          disabled={isAccepting || isDeclining}
        >
          {isDeclining ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <X className="w-3 h-3" />
          )}
          Decline
        </Button>
      </div>
    </Card>
  );
}
