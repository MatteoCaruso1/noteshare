import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClickableAvatar } from '@/components/ClickableAvatar';
import { useFriends } from '@/hooks/useFriendships';
import { Users, Music, Handshake, Guitar } from 'lucide-react';

interface FriendsListProps {
  children: React.ReactNode;
}

export function FriendsList({ children }: FriendsListProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: friends, isLoading } = useFriends();

  const handleFriendClick = (friendId: string) => {
    setOpen(false);
    navigate(`/user/${friendId}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
        
        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Loading friends...
            </div>
          ) : friends && friends.length > 0 ? (
            <div className="space-y-2 pr-2">
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
                    <p className="font-medium text-sm truncate">{friend.name}</p>
                    <p className="text-xs text-muted-foreground truncate mb-2">@{friend.username}</p>
                    
                    <div className="flex flex-wrap gap-1">
                      {friend.open_to_collaborate && (
                        <Badge variant="outline" className="text-xs py-0 px-1.5 gap-0.5 border-primary/30 text-primary">
                          <Handshake className="w-3 h-3" />
                          Open to collab
                        </Badge>
                      )}
                      
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
            <div className="py-8 text-center">
              <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No friends yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Search for musicians above to add friends
              </p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}