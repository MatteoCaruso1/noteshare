import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SignedImage } from '@/components/SignedImage';
import { useAcceptGroupInvite, useDeclineGroupInvite, GroupInvite } from '@/hooks/useGroupInvites';
import { Users, Music, Check, X, Loader2 } from 'lucide-react';

interface PendingGroupInviteCardProps {
  invite: GroupInvite;
}

export function PendingGroupInviteCard({ invite }: PendingGroupInviteCardProps) {
  const navigate = useNavigate();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  
  const acceptInvite = useAcceptGroupInvite({
    onSuccessNavigate: () => {
      // Navigate to My Groups tab after accepting
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
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      await declineInvite.mutateAsync(invite.id);
    } finally {
      setIsDeclining(false);
    }
  };

  return (
    <Card className="p-3 bg-primary/5 border-primary/20">
      <div className="flex items-start gap-3">
        {/* Group Avatar */}
        <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center overflow-hidden shrink-0">
          {invite.group?.cover_image ? (
            <SignedImage 
              src={invite.group.cover_image} 
              alt={invite.group.name || 'Group'}
              className="w-full h-full object-cover"
            />
          ) : (
            <Music className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Inviter info */}
          <p className="text-sm">
            <span className="font-medium">{invite.inviter?.name}</span>
            <span className="text-muted-foreground"> invited you to join</span>
          </p>
          
          {/* Group name */}
          <p className="font-medium text-sm truncate">{invite.group?.name}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        <Button
          variant="default"
          size="sm"
          className="flex-1 gap-1"
          onClick={handleAccept}
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
          className="flex-1 gap-1"
          onClick={handleDecline}
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
