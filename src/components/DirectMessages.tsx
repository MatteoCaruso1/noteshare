import { useState, useRef, useEffect } from 'react';
import { useConversations, useMessages, useSendMessage } from '@/hooks/useMessages';
import { useFriends } from '@/hooks/useFriendships';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, User, Send, ArrowLeft, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Profile } from '@/types';

export function DirectMessages() {
  const { profile } = useAuth();
  const { data: conversations, isLoading: convsLoading } = useConversations();
  const { data: friends } = useFriends();
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null);
  const [showNewMessage, setShowNewMessage] = useState(false);

  if (selectedFriend) {
    return (
      <ChatView 
        friend={selectedFriend} 
        onBack={() => setSelectedFriend(null)} 
      />
    );
  }

  if (showNewMessage) {
    return (
      <NewMessageView 
        friends={friends || []}
        existingConversations={conversations?.map(c => c.friendId) || []}
        onSelect={(friend) => {
          setSelectedFriend(friend);
          setShowNewMessage(false);
        }}
        onBack={() => setShowNewMessage(false)}
      />
    );
  }

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Messages</h3>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowNewMessage(true)}
        >
          New
        </Button>
      </div>

      {convsLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Loading...
        </div>
      ) : conversations && conversations.length > 0 ? (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <div
              key={conv.friendId}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
              onClick={() => setSelectedFriend(conv.friend)}
            >
              <Avatar className="w-10 h-10">
                <AvatarImage src={conv.friend.avatar || ''} />
                <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{conv.friend.name}</p>
                  {conv.unreadCount > 0 && (
                    <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                      {conv.unreadCount}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {conv.lastMessage.sender_id === profile?.id ? 'You: ' : ''}
                  {conv.lastMessage.content}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(conv.lastMessage.created_at), 'MMM d')}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No messages yet</p>
          <p className="text-xs mt-1">Start a conversation with a friend</p>
        </div>
      )}
    </Card>
  );
}

function NewMessageView({ 
  friends, 
  existingConversations,
  onSelect, 
  onBack 
}: { 
  friends: Profile[];
  existingConversations: string[];
  onSelect: (friend: Profile) => void;
  onBack: () => void;
}) {
  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h3 className="font-semibold">New Message</h3>
      </div>

      {friends.length > 0 ? (
        <div className="space-y-2">
          {friends.map((friend) => (
            <div
              key={friend.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
              onClick={() => onSelect(friend)}
            >
              <Avatar className="w-10 h-10">
                <AvatarImage src={friend.avatar || ''} />
                <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{friend.name}</p>
                <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
              </div>
              {existingConversations.includes(friend.id) && (
                <Badge variant="secondary" className="text-[10px]">
                  Active
                </Badge>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No friends yet</p>
          <p className="text-xs mt-1">Add friends to start messaging</p>
        </div>
      )}
    </Card>
  );
}

function ChatView({ friend, onBack }: { friend: Profile; onBack: () => void }) {
  const { profile } = useAuth();
  const { data: messages, isLoading } = useMessages(friend.id);
  const sendMessage = useSendMessage();
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessage.mutate(
      { receiverId: friend.id, content: newMessage },
      { onSuccess: () => setNewMessage('') }
    );
  };

  return (
    <Card className="p-0 bg-card border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-8 h-8">
          <AvatarImage src={friend.avatar || ''} />
          <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{friend.name}</p>
          <p className="text-xs text-muted-foreground">@{friend.username}</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="h-64 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Loading...
          </div>
        ) : messages && messages.length > 0 ? (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isMe = msg.sender_id === profile?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-lg ${
                      isMe 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {format(new Date(msg.created_at), 'h:mm a')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Start the conversation!
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="flex items-center gap-2 p-4 border-t border-border">
        <Input
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1"
        />
        <Button 
          size="icon" 
          onClick={handleSend}
          disabled={!newMessage.trim() || sendMessage.isPending}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
