import { useState } from 'react';
import { useFriends } from '@/hooks/useFriendships';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { User, UserPlus, X } from 'lucide-react';
import { Profile } from '@/types';

interface CollaboratorPickerProps {
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  label?: string;
}

export function CollaboratorPicker({ selectedIds, onSelect, label = "Tag Collaborators" }: CollaboratorPickerProps) {
  const { data: friends } = useFriends();
  const [open, setOpen] = useState(false);

  const selectedFriends = friends?.filter(f => selectedIds.includes(f.id)) || [];

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
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <UserPlus className="w-4 h-4" />
              Add
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="end">
            {friends && friends.length > 0 ? (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {friends.map((friend) => {
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
                        <Badge variant="default" className="text-[10px]">Added</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Add friends first to tag them
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {selectedFriends.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedFriends.map((friend) => (
            <Badge key={friend.id} variant="secondary" className="gap-1 pr-1">
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
