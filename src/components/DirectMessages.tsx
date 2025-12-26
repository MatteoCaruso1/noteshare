import { useState, useRef, useEffect } from 'react';
import { useConversations, useMessages, useSendMessage } from '@/hooks/useMessages';
import { useFriends } from '@/hooks/useFriendships';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClickableAvatar } from '@/components/ClickableAvatar';
import { MessageCircle, Send, ArrowLeft, Users, List, ListOrdered } from 'lucide-react';
import { format } from 'date-fns';
import { Profile } from '@/types';

interface DirectMessagesProps {
  embedded?: boolean;
}

export function DirectMessages({ embedded }: DirectMessagesProps = {}) {
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

  // When embedded in dropdown, use a more compact layout
  if (embedded) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex justify-end mb-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowNewMessage(true)}
            className="text-xs h-7"
          >
            New message
          </Button>
        </div>
        {convsLoading ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Loading...
          </div>
        ) : conversations && conversations.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {conversations.slice(0, 5).map((conv) => (
              <div
                key={conv.friendId}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setSelectedFriend(conv.friend)}
              >
                <ClickableAvatar
                  profileId={conv.friendId}
                  avatar={conv.friend.avatar}
                  name={conv.friend.name}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-xs truncate">{conv.friend.name}</p>
                    {conv.unreadCount > 0 && (
                      <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[9px]">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {conv.lastMessage.sender_id === profile?.id ? 'You: ' : ''}
                    {conv.lastMessage.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <MessageCircle className="w-6 h-6 mx-auto mb-1 opacity-50" />
            <p className="text-xs">No messages yet</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span>Messages</span>
        </h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowNewMessage(true)}
        >
          New
        </Button>
      </div>
      <Card className="p-4 bg-card border-border">

      {convsLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Loading...
        </div>
      ) : conversations && conversations.length > 0 ? (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <div
              key={conv.friendId}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => setSelectedFriend(conv.friend)}
            >
              <ClickableAvatar
                profileId={conv.friendId}
                avatar={conv.friend.avatar}
                name={conv.friend.name}
                size="lg"
              />
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
    </div>
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
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onSelect(friend)}
            >
              <ClickableAvatar
                profileId={friend.id}
                avatar={friend.avatar}
                name={friend.name}
                size="lg"
              />
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const insertListPrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const text = textarea.value;
    
    // Find line start
    let lineStart = start;
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
      lineStart--;
    }
    
    // Find line end
    let lineEnd = start;
    while (lineEnd < text.length && text[lineEnd] !== '\n') {
      lineEnd++;
    }
    
    const line = text.substring(lineStart, lineEnd);
    const bulletMatch = line.match(/^(\s*)([-•]\s)/);
    const numberMatch = line.match(/^(\s*)(\d+\.\s)/);
    
    let newLine: string;
    
    if (prefix === '• ') {
      if (bulletMatch) {
        newLine = line.replace(/^(\s*)[-•]\s/, '$1');
      } else if (numberMatch) {
        newLine = line.replace(/^(\s*)\d+\.\s/, '$1• ');
      } else {
        newLine = '• ' + line;
      }
    } else {
      if (numberMatch) {
        newLine = line.replace(/^(\s*)\d+\.\s/, '$1');
      } else if (bulletMatch) {
        newLine = line.replace(/^(\s*)[-•]\s/, '$11. ');
      } else {
        newLine = '1. ' + line;
      }
    }
    
    const newValue = text.substring(0, lineStart) + newLine + text.substring(lineEnd);
    setNewMessage(newValue);
    textarea.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const text = newMessage;
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      
      // Find line start
      let lineStart = start;
      while (lineStart > 0 && text[lineStart - 1] !== '\n') {
        lineStart--;
      }
      
      const line = text.substring(lineStart, start);
      const bulletMatch = line.match(/^(\s*)([-•])\s/);
      const numberMatch = line.match(/^(\s*)(\d+)\.\s/);
      
      if (bulletMatch || numberMatch) {
        const contentAfterPrefix = bulletMatch 
          ? line.replace(/^(\s*)[-•]\s/, '')
          : line.replace(/^(\s*)\d+\.\s/, '');
        
        if (contentAfterPrefix.trim() === '') {
          e.preventDefault();
          const newValue = text.substring(0, lineStart) + text.substring(start);
          setNewMessage(newValue);
          return;
        }
        
        e.preventDefault();
        const indent = bulletMatch ? bulletMatch[1] : numberMatch![1];
        let prefix: string;
        
        if (bulletMatch) {
          prefix = indent + bulletMatch[2] + ' ';
        } else {
          const num = parseInt(numberMatch![2]) + 1;
          prefix = indent + num + '. ';
        }
        
        const newValue = text.substring(0, start) + '\n' + prefix + text.substring(start);
        setNewMessage(newValue);
        
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1 + prefix.length;
        }, 0);
      } else {
        // Regular enter - send message
        e.preventDefault();
        handleSend();
      }
    }
    
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const text = newMessage;
      
      // Find line start
      let lineStart = start;
      while (lineStart > 0 && text[lineStart - 1] !== '\n') {
        lineStart--;
      }
      
      // Find line end
      let lineEnd = start;
      while (lineEnd < text.length && text[lineEnd] !== '\n') {
        lineEnd++;
      }
      
      const line = text.substring(lineStart, lineEnd);
      const indent = '  ';
      
      if (e.shiftKey && line.startsWith(indent)) {
        const newValue = text.substring(0, lineStart) + line.substring(indent.length) + text.substring(lineEnd);
        setNewMessage(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, start - indent.length);
        }, 0);
      } else if (!e.shiftKey) {
        const newValue = text.substring(0, lineStart) + indent + text.substring(lineStart);
        setNewMessage(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + indent.length;
        }, 0);
      }
    }
  };

  return (
    <Card className="p-0 bg-card border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <ClickableAvatar
          profileId={friend.id}
          avatar={friend.avatar}
          name={friend.name}
          size="md"
        />
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
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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

      {/* Input - with list formatting support */}
      <div className="border-t border-border bg-card">
        <div className="flex gap-1 px-4 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => insertListPrefix('• ')}
            title="Bullet list"
          >
            <List className="w-3 h-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => insertListPrefix('1. ')}
            title="Numbered list"
          >
            <ListOrdered className="w-3 h-3" />
          </Button>
        </div>
        <div className="flex items-end gap-2 p-4 pt-1">
          <Textarea
            ref={textareaRef}
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-h-[40px] max-h-[120px] resize-none text-sm"
            rows={1}
            onFocus={(e) => {
              setTimeout(() => {
                e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }, 100);
            }}
          />
          <Button 
            size="icon" 
            onClick={handleSend}
            disabled={!newMessage.trim() || sendMessage.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
