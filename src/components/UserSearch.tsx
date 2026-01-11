import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or username..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          className={`bg-secondary/30 border-border placeholder:text-muted-foreground ${compact ? "pl-9 h-9 text-sm" : "pl-9"}`}
          autoFocus={false}
        />
      </div>

      {/* Stable height container for content below search */}
      <div className="min-h-[120px]">
        {/* Initial hint when not searching */}
        {!showSearchResults && !showSuggestions && !suggestionsLoading && (
          <div className="mt-4 text-center py-6 animate-fade-in">
            <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Search for musicians to add as friends
            </p>
          </div>
        )}
      
      {/* Suggested Musicians (when focused but no search query) */}
      {showSuggestions && (
        <div className="mt-3 p-3 bg-secondary/20 rounded-lg border border-border animate-fade-in">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Suggested for you</span>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
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
        </div>
      )}

      {/* Loading suggestions - skeleton with stable height */}
      {isFocused && query.length < 2 && suggestionsLoading && (
        <div className="mt-3 p-3 bg-secondary/20 rounded-lg border border-border animate-fade-in">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-7 w-14 rounded" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {showSearchResults && (
        <div className="mt-3 p-2 bg-secondary/20 rounded-lg border border-border max-h-[350px] overflow-y-auto animate-fade-in">
          {isLoading ? (
            <div className="space-y-2 p-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 py-3 px-2">
                  <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-8 w-24 rounded" />
                </div>
              ))}
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            <div className="divide-y divide-border">
              {searchResults.map((user) => (
                <div 
                  key={user.id} 
                  className="flex items-center gap-3 py-3 px-2 cursor-pointer hover:bg-secondary/30 transition-colors rounded-lg"
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
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-muted-foreground text-sm">
              No musicians found
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}