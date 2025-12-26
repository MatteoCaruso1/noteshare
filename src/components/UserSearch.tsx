import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ClickableAvatar } from '@/components/ClickableAvatar';
import { Search, UserPlus, UserCheck, Clock, X, Users, Sparkles, Music, Handshake } from 'lucide-react';
import { useSearchUsers, useSendFriendRequest, useFriendships, useRespondToFriendRequest, useSuggestedMusicians, SuggestionReason } from '@/hooks/useFriendships';
import { useAuth } from '@/hooks/useAuth';
import { Profile } from '@/types';
import { useNavigate } from 'react-router-dom';

const ReasonBadge = ({ reason, matchingGenres }: { reason: SuggestionReason; matchingGenres?: string[] }) => {
  switch (reason) {
    case 'mutual':
      return null; // Handled separately with count
    case 'collaborate':
      return (
        <Badge variant="outline" className="text-xs py-0 px-1.5 gap-0.5 border-primary/30 text-primary">
          <Handshake className="w-3 h-3" />
          Open to collab
        </Badge>
      );
    case 'genre':
      return (
        <Badge variant="outline" className="text-xs py-0 px-1.5 gap-0.5 border-accent/50 text-accent-foreground">
          <Music className="w-3 h-3" />
          {matchingGenres && matchingGenres.length > 0 
            ? matchingGenres.slice(0, 2).join(', ')
            : 'Similar taste'}
        </Badge>
      );
    default:
      return null;
  }
};

interface UserSearchProps {
  compact?: boolean;
}

export function UserSearch({ compact }: UserSearchProps = {}) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: searchResults, isLoading } = useSearchUsers(query);
  const { data: friendships } = useFriendships();
  const { data: suggestedMusicians, isLoading: suggestionsLoading } = useSuggestedMusicians();
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

  const renderFriendButton = (targetProfile: Profile, compact?: boolean) => {
    const status = getFriendshipStatus(targetProfile.id);
    
    if (!status) {
      return (
        <Button
          size="sm"
          variant={compact ? "default" : "outline"}
          onClick={(e) => {
            e.stopPropagation();
            handleAddFriend(targetProfile.id);
          }}
          disabled={sendRequest.isPending}
          className={compact ? "h-7 text-xs" : ""}
        >
          <UserPlus className="w-4 h-4 mr-1" />
          {compact ? "Add" : "Add Friend"}
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
              onClick={(e) => {
                e.stopPropagation();
                handleAccept(status.friendshipId);
              }}
              disabled={respondToRequest.isPending}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleDecline(status.friendshipId);
              }}
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
        variant={compact ? "default" : "outline"}
        onClick={(e) => {
          e.stopPropagation();
          handleAddFriend(targetProfile.id);
        }}
        disabled={sendRequest.isPending}
        className={compact ? "h-7 text-xs" : ""}
      >
        <UserPlus className="w-4 h-4 mr-1" />
        {compact ? "Add" : "Add Friend"}
      </Button>
    );
  };

  const showSuggestions = isFocused && query.length < 2 && suggestedMusicians && suggestedMusicians.length > 0;
  const showSearchResults = query.length >= 2;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
        <Input
          placeholder={compact ? "Search musicians" : "Search musicians by name or @handle"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          className={`bg-primary/10 border-primary/20 placeholder:text-primary/60 ${compact ? "pl-9 h-9 text-sm" : "pl-9"}`}
        />
      </div>
      
      {/* Suggested Musicians (when focused but no search query) */}
      {showSuggestions && (
        <Card className="p-3 bg-card border-border">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Suggested for you</span>
          </div>
          <div className="space-y-2">
            {suggestedMusicians.map((user) => (
              <div 
                key={user.id} 
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/user/${user.id}`)}
              >
                <ClickableAvatar
                  profileId={user.id}
                  avatar={user.avatar}
                  name={user.name}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate mb-1">@{user.username}</p>
                  <div className="flex flex-wrap items-center gap-1">
                    {user.mutualCount > 0 && (
                      <Badge variant="secondary" className="text-xs py-0 px-1.5 gap-0.5">
                        <Users className="w-3 h-3" />
                        {user.mutualCount} mutual
                      </Badge>
                    )}
                    {user.reasons.filter(r => r !== 'mutual').map((reason) => (
                      <ReasonBadge 
                        key={reason} 
                        reason={reason} 
                        matchingGenres={reason === 'genre' ? user.matchingGenres : undefined} 
                      />
                    ))}
                  </div>
                </div>
                {renderFriendButton(user, true)}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Loading suggestions */}
      {isFocused && query.length < 2 && suggestionsLoading && (
        <Card className="p-4 bg-card border-border">
          <div className="text-center text-muted-foreground text-sm">
            Finding suggestions...
          </div>
        </Card>
      )}

      {/* Search Results */}
      {showSearchResults && (
        <Card className="p-2 bg-card border-border divide-y divide-border">
          {isLoading ? (
            <div className="py-4 text-center text-muted-foreground text-sm">
              Searching...
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            searchResults.map((user) => (
              <div 
                key={user.id} 
                className="flex items-center gap-3 py-3 px-2 cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => navigate(`/user/${user.id}`)}
              >
                <ClickableAvatar
                  profileId={user.id}
                  avatar={user.avatar}
                  name={user.name}
                  size="lg"
                />
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