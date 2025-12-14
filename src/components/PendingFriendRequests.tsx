import { usePendingFriendRequests, useRespondToFriendRequest } from '@/hooks/useFriendships';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClickableAvatar } from '@/components/ClickableAvatar';
import { Check, X, UserPlus } from 'lucide-react';

export function PendingFriendRequests() {
  const { data: requests, isLoading } = usePendingFriendRequests();
  const respondToRequest = useRespondToFriendRequest();

  if (isLoading || !requests || requests.length === 0) {
    return null;
  }

  const handleAccept = (friendshipId: string) => {
    respondToRequest.mutate({ friendshipId, status: 'accepted' });
  };

  const handleDecline = (friendshipId: string) => {
    respondToRequest.mutate({ friendshipId, status: 'rejected' });
  };

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center gap-2 mb-3">
        <UserPlus className="w-4 h-4 text-primary" />
        <h3 className="font-medium text-sm">Friend Requests</h3>
        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
          {requests.length}
        </span>
      </div>
      <div className="space-y-3">
        {requests.map((request) => (
          <div key={request.id} className="flex items-center gap-3">
            <ClickableAvatar
              profileId={request.requester?.id || ''}
              avatar={request.requester?.avatar}
              name={request.requester?.name}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{request.requester?.name}</p>
              <p className="text-xs text-muted-foreground truncate">@{request.requester?.username}</p>
            </div>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="default"
                className="h-8 w-8"
                onClick={() => handleAccept(request.id)}
                disabled={respondToRequest.isPending}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => handleDecline(request.id)}
                disabled={respondToRequest.isPending}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
