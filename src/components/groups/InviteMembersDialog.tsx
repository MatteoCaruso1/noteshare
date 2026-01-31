import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Search, X, Check, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useFriends, useSearchUsers } from '@/hooks/useFriendships';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types';

interface InviteMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
}

export function InviteMembersDialog({ open, onOpenChange, groupId, groupName }: InviteMembersDialogProps) {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  
  // Get user's friends
  const { data: friends = [] } = useFriends();
  
  // Search results (only show friends for now, but could expand to all users)
  const { data: searchResults = [], isLoading: isSearching } = useSearchUsers(searchQuery);
  
  // Filter friends based on search or show all friends if no search
  const displayedUsers = searchQuery.length >= 2 
    ? searchResults 
    : friends;
  
  const toggleFriend = (friendId: string) => {
    setSelectedFriendIds(prev => 
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };
  
  const handleSendInvites = useCallback(async () => {
    if (selectedFriendIds.length === 0 || !profile?.id) return;
    
    setIsSending(true);
    try {
      // Create a notification for each selected friend
      const notifications = selectedFriendIds.map((friendId) => ({
        user_id: friendId,
        type: 'group_invite',
        content: `invited you to join their group "${groupName}"`,
        from_user_id: profile.id,
        note_id: null,
      }));
      
      const { error } = await supabase
        .from('notifications')
        .insert(notifications);
      
      if (error) throw error;
      
      toast.success(`Invited ${selectedFriendIds.length} friend${selectedFriendIds.length > 1 ? 's' : ''}!`);
      setSelectedFriendIds([]);
      setSearchQuery('');
      onOpenChange(false);
    } catch (err) {
      console.error('Error sending invites:', err);
      toast.error('Failed to send invites');
    } finally {
      setIsSending(false);
    }
  }, [selectedFriendIds, profile?.id, groupName, onOpenChange]);
  
  const getSelectedUser = (id: string): Profile | undefined => {
    return friends.find(f => f.id === id) || searchResults.find(u => u.id === id);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Invite Friends to {groupName}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Selected Friends */}
          {selectedFriendIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedFriendIds.map((friendId) => {
                const friend = getSelectedUser(friendId);
                if (!friend) return null;
                return (
                  <div
                    key={friend.id}
                    className="flex items-center gap-1.5 bg-primary/20 rounded-full pl-1 pr-2 py-0.5"
                  >
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={friend.avatar || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {friend.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{friend.name}</span>
                    <button
                      onClick={() => toggleFriend(friend.id)}
                      className="ml-0.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Friends List */}
          <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : displayedUsers.length > 0 ? (
              <div className="space-y-1">
                {displayedUsers.map((user) => {
                  const isSelected = selectedFriendIds.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => toggleFriend(user.id)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        isSelected 
                          ? 'bg-primary/15 border border-primary/30' 
                          : 'hover:bg-secondary/50'
                      }`}
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.avatar || undefined} />
                        <AvatarFallback>
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium text-sm truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        isSelected 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        {isSelected ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <UserPlus className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : searchQuery.length >= 2 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No users found
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                You haven't added any friends yet
              </div>
            ) : null}
          </div>
          
          {/* Send Button */}
          <Button 
            className="w-full" 
            onClick={handleSendInvites}
            disabled={selectedFriendIds.length === 0 || isSending}
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite {selectedFriendIds.length > 0 ? `${selectedFriendIds.length} Friend${selectedFriendIds.length > 1 ? 's' : ''}` : 'Friends'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
