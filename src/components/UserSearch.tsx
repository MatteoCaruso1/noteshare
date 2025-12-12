import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Search, User, UserPlus, UserCheck, Clock, X } from 'lucide-react';
import { useSearchUsers, useSendFriendRequest, useFriendships, useRespondToFriendRequest } from '@/hooks/useFriendships';
import { useAuth } from '@/hooks/useAuth';
import { Profile } from '@/types';

export function UserSearch() {
  const [query, setQuery] = useState('');
  const { profile } = useAuth();
  const { data: searchResults, isLoading } = useSearchUsers(query);
  const { data: friendships } = useFriendships();
  const sendRequest = useSendFriendRequest();
  const respondToRequest = useRespondToFriendRequest();

  const getFriendshipStatus = (targetId: string) => {
    if (!friendships) return null;
    
    const friendship = friendships.find(
      f => (f.requester_id === targetId || f.addressee_id === targetId)
    );
    
    if (!friendship) return null;
    
    return {
      status: friendship.status,
      isRequester: friendship.requester_id === profile?.id,
      friendshipId: friendship.id,
    };
  };

  const handleAddFriend = (targetId: string) => {
    sendRequest.mutate(targetId);
  };

  const handleAccept = (friendshipId: string) => {
    respondToRequest.mutate({ friendshipId, status: 'accepted' });
  };

  const handleDecline = (friendshipId: string) => {
    respondToRequest.mutate({ friendshipId, status: 'rejected' });
  };

  const renderFriendButton = (targetProfile: Profile) => {
    const status = getFriendshipStatus(targetProfile.id);
    
    if (!status) {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAddFriend(targetProfile.id)}
          disabled={sendRequest.isPending}
        >
          <UserPlus className="w-4 h-4 mr-1" />
          Add Friend
        </Button>
      );
    }
    
    if (status.status === 'accepted') {
      return (
        <Badge variant="secondary" className="gap-1">
          <UserCheck className="w-3 h-3" />
          Friends
        </Badge>
      );
    }
    
    if (status.status === 'pending') {
      if (status.isRequester) {
        return (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
      } else {
        return (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="default"
              onClick={() => handleAccept(status.friendshipId)}
              disabled={respondToRequest.isPending}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDecline(status.friendshipId)}
              disabled={respondToRequest.isPending}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        );
      }
    }
    
    // Rejected - allow re-requesting
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleAddFriend(targetProfile.id)}
        disabled={sendRequest.isPending}
      >
        <UserPlus className="w-4 h-4 mr-1" />
        Add Friend
      </Button>
    );
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search musicians by name or @handle"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      
      {query.length >= 2 && (
        <Card className="p-2 bg-card border-border divide-y divide-border">
          {isLoading ? (
            <div className="py-4 text-center text-muted-foreground text-sm">
              Searching...
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            searchResults.map((user) => (
              <div key={user.id} className="flex items-center gap-3 py-3 px-2">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user.avatar || ''} />
                  <AvatarFallback>
                    <User className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                  {user.instruments && user.instruments.length > 0 && (
                    <p className="text-xs text-muted-foreground truncate">
                      {user.instruments.slice(0, 2).join(', ')}
                      {user.instruments.length > 2 && ` +${user.instruments.length - 2}`}
                    </p>
                  )}
                </div>
                {renderFriendButton(user)}
              </div>
            ))
          ) : (
            <div className="py-4 text-center text-muted-foreground text-sm">
              No musicians found
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
