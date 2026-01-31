import { useState } from 'react';
import { useFriends } from '@/hooks/useFriendships';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { User, Users, X, Search, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Profile } from '@/types';

interface PlayingWithPickerProps {
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
}

export function PlayingWithPicker({ selectedIds, onSelect }: PlayingWithPickerProps) {
  const { data: friends } = useFriends();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedFriends = friends?.filter(f => selectedIds.includes(f.id)) || [];
  
  // Filter friends based on search query
  const filteredFriends = friends?.filter(friend => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      friend.name.toLowerCase().includes(query) ||
      friend.username.toLowerCase().includes(query)
    );
  }) || [];

  const toggleFriend = (friendId: string) => {
    if (selectedIds.includes(friendId)) {
      onSelect(selectedIds.filter(id => id !== friendId));
    } else {
      onSelect([...selectedIds, friendId]);
    }
  };

  const removeFriend = (friendId: string) => {
    onSelect(selectedIds.filter(id => id !== friendId));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Users className="w-4 h-4" />
          Playing with
        </span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Plus className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="start">
            {/* Search input */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
            
            {friends && friends.length > 0 ? (
              <ScrollArea className="h-48">
                <div className="space-y-1 pr-3">
                  {filteredFriends.length > 0 ? (
                    filteredFriends.map((friend) => {
                      const isSelected = selectedIds.includes(friend.id);
                      return (
                        <div
                          key={friend.id}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary/10' : 'hover:bg-secondary/50'
                          }`}
                          onClick={() => toggleFriend(friend.id)}
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={friend.avatar || ''} />
                            <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{friend.name}</p>
                            <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
                          </div>
                          {isSelected && (
                            <Badge variant="default" className="text-[10px] shrink-0">Added</Badge>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-3 text-muted-foreground text-sm">
                      No friends match "{searchQuery}"
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Add friends first to practice together
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {selectedFriends.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedFriends.map((friend) => (
            <Badge key={friend.id} variant="secondary" className="gap-1 pr-1 py-1">
              <Avatar className="w-4 h-4">
                <AvatarImage src={friend.avatar || ''} />
                <AvatarFallback><User className="w-2 h-2" /></AvatarFallback>
              </Avatar>
              <span className="text-xs">{friend.name}</span>
              <button
                onClick={() => removeFriend(friend.id)}
                className="ml-1 hover:bg-secondary rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
