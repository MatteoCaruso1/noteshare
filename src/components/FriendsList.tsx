import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ClickableAvatar } from '@/components/ClickableAvatar';
import { UserSearch } from '@/components/UserSearch';
import { useFriends } from '@/hooks/useFriendships';
import { Users, Music, Guitar, Flame, UserPlus, ChevronDown, ChevronUp } from 'lucide-react';

interface FriendsListProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function FriendsList({ children, open, onOpenChange }: FriendsListProps) {
  const navigate = useNavigate();
  const { data: friends, isLoading } = useFriends();
  const [addFriendExpanded, setAddFriendExpanded] = useState(false);

  const handleFriendClick = (friendId: string) => {
    if (!friendId || friendId === 'undefined' || friendId === 'null') {
      console.warn('[FriendsList] Invalid friendId:', friendId);
      return;
    }
    
    onOpenChange?.(false);
    try {
      navigate(`/user/${friendId}`, { state: { fromFriendsList: true } });
    } catch (error) {
      console.error('[FriendsList] Navigation error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      onOpenChange?.(o);
      if (!o) setAddFriendExpanded(false);
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Your Friends
            <Badge variant="secondary" className="ml-2">
              {friends?.length || 0}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Add Friend Section */}
        <button
          onClick={() => setAddFriendExpanded(!addFriendExpanded)}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors text-left"
        >
          <UserPlus className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary flex-1">Add Friend</span>
          {addFriendExpanded ? (
            <ChevronUp className="w-4 h-4 text-primary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-primary" />
          )}
        </button>
        {addFriendExpanded && (
          <div className="pb-1">
            <UserSearch />
          </div>
        )}
        
        <div className="border-y border-border">
          <ScrollArea className="h-[60vh]">
            <div className="min-h-[200px] py-3 pr-2">
              {isLoading ? (
                <div className="space-y-2 animate-fade-in">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                      <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-8" />
                        </div>
                        <Skeleton className="h-3 w-20" />
                        <div className="flex gap-1">
                          <Skeleton className="h-5 w-20 rounded-full" />
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : friends && friends.length > 0 ? (
                <div className="space-y-2 animate-fade-in">
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      onClick={() => handleFriendClick(friend.id)}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer border border-border"
                    >
                      <ClickableAvatar
                        profileId={friend.id}
                        avatar={friend.avatar}
                        name={friend.name}
                        size="lg"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{friend.name}</p>
                          <div className="flex items-center gap-0.5">
                            <Flame className={`w-3.5 h-3.5 ${(friend.current_streak || 0) > 0 ? 'text-primary' : 'text-muted-foreground/40'}`} />
                            <span className={`text-xs font-medium ${(friend.current_streak || 0) > 0 ? 'text-primary' : 'text-muted-foreground/40'}`}>
                              {friend.current_streak || 0}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mb-2">@{friend.username}</p>
                        
                        <div className="flex flex-wrap gap-1">
                          {friend.instruments && friend.instruments.length > 0 && (
                            <Badge variant="secondary" className="text-xs py-0 px-1.5 gap-0.5">
                              <Guitar className="w-3 h-3" />
                              {friend.instruments.slice(0, 2).join(', ')}
                              {friend.instruments.length > 2 && ` +${friend.instruments.length - 2}`}
                            </Badge>
                          )}
                          
                          {friend.genres && friend.genres.length > 0 && (
                            <Badge variant="outline" className="text-xs py-0 px-1.5 gap-0.5 border-accent/50">
                              <Music className="w-3 h-3" />
                              {friend.genres.slice(0, 2).join(', ')}
                              {friend.genres.length > 2 && ` +${friend.genres.length - 2}`}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center animate-fade-in">
                  <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No friends yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use "Add Friend" above to find musicians
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}