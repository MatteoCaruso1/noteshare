import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useConversations, useMessages, useSendMessage } from '@/hooks/useMessages';
import { useFriends } from '@/hooks/useFriendships';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClickableAvatar } from '@/components/ClickableAvatar';
import { MessageCircle, Send, ArrowLeft, Users, PenSquare } from 'lucide-react';
import { format } from 'date-fns';
import { Profile } from '@/types';

interface DirectMessagesProps {
  embedded?: boolean;
  showNewMessageView?: boolean;
  onNewMessageViewChange?: (show: boolean) => void;
  onInChatViewChange?: (inChat: boolean) => void;
  initialSelectedFriend?: Profile | null;
}

export function DirectMessages({ embedded, showNewMessageView, onNewMessageViewChange, onInChatViewChange, initialSelectedFriend }: DirectMessagesProps = {}) {
  const { profile } = useAuth();
  const { data: conversations, isLoading: convsLoading } = useConversations();
  const { data: friends } = useFriends();
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(initialSelectedFriend || null);
  const [internalShowNewMessage, setInternalShowNewMessage] = useState(false);
  
  // Use external control if provided, otherwise internal state
  const showNewMessage = showNewMessageView !== undefined ? showNewMessageView : internalShowNewMessage;
  const setShowNewMessage = onNewMessageViewChange || setInternalShowNewMessage;

  // Notify parent when entering/leaving chat view
  useEffect(() => {
    onInChatViewChange?.(!!selectedFriend);
  }, [selectedFriend, onInChatViewChange]);

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
      <div className="bg-card border border-border rounded-lg p-3">
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
          variant="ghost" 
          size="icon"
          onClick={() => setShowNewMessage(true)}
          title="New message"
        >
          <PenSquare className="w-5 h-5" />
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
        <button 
          onClick={onBack}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-secondary/80 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  // Use layout effect to scroll before paint, preventing visual jump
  useLayoutEffect(() => {
    if (!isLoading && messages) {
      // Small delay to ensure content is rendered, then scroll to end ref
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ block: 'end' });
        setIsReady(true);
      });
    }
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessage.mutate(
      { receiverId: friend.id, content: newMessage },
      { onSuccess: () => setNewMessage('') }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col max-h-[60vh]">
      {/* Header - sticky at top */}
      <div className="flex items-center gap-3 p-3 border-b border-border shrink-0 bg-background">
        <button 
          onClick={onBack}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-secondary/80 transition-colors shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
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

      {/* Messages - scrollable area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-3 min-h-0"
        style={{ opacity: isLoading || !isReady ? 0 : 1, transition: 'opacity 0.15s' }}
      >
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[80%] px-3 py-2 rounded-lg bg-muted animate-pulse h-12 w-32" />
              </div>
            ))}
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
            <div ref={messagesEndRef} className="h-1" />
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Start the conversation!
          </div>
        )}
      </div>

      {/* Input - fixed at bottom */}
      <div className="border-t border-border bg-background shrink-0">
        <div className="flex items-end gap-2 p-3">
          <Textarea
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-h-[40px] max-h-[120px] resize-none text-sm"
            rows={1}
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
    </div>
  );
}
