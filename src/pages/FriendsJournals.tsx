import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BottomNav } from '@/components/BottomNav';
import { PageLayout, PageHeader, PageBody } from '@/components/PageLayout';
import { UserSearch } from '@/components/UserSearch';
import { FriendsFeed } from '@/components/FriendsFeed';
import { PendingFriendRequests } from '@/components/PendingFriendRequests';
import { DirectMessages } from '@/components/DirectMessages';
import { FriendsList } from '@/components/FriendsList';
import { NotificationsList } from '@/components/NotificationsList';
import { TimelineSearch } from '@/components/TimelineSearch';
import { useFriends } from '@/hooks/useFriendships';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { useConversations } from '@/hooks/useMessages';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Bell, MessageCircle, PenSquare, UserPlus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const FriendsJournals = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: friends } = useFriends();
  const { data: unreadNotificationCount } = useUnreadNotificationCount();
  const { data: conversations } = useConversations();
  const [feedSearchQuery, setFeedSearchQuery] = useState('');
  const [focusDateFilter, setFocusDateFilter] = useState<Date | undefined>(undefined);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [showNewMessageView, setShowNewMessageView] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [inChatView, setInChatView] = useState(false);
  
  // Track if user has ever clicked the add friend button
  const [hasClickedAddFriend, setHasClickedAddFriend] = useState(() => {
    return localStorage.getItem('hasClickedAddFriend') === 'true';
  });
  
  // Check if we should open the friends list (coming back from a profile)
  const [friendsListOpen, setFriendsListOpen] = useState(false);
  
  // Calculate unread messages count
  const unreadMessagesCount = conversations?.reduce((sum, c) => sum + c.unreadCount, 0) || 0;
  
  useEffect(() => {
    if (location.state?.openFriendsList) {
      setFriendsListOpen(true);
      // Clear the state so it doesn't reopen on subsequent navigations
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <PageLayout>
      {/* Page Header with Search */}
      <PageHeader>
        <div className="container max-w-2xl mx-auto px-4 pt-4 pb-2">
          <div className="flex items-center justify-between gap-3 h-9">
            <h1 className="text-lg sm:text-xl font-semibold shrink-0">Friends' Practice</h1>
            <div className="flex items-center gap-2 flex-1 justify-end">
              {/* Notifications Button */}
              <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <DialogTrigger asChild>
                  <div className="relative cursor-pointer transition-colors flex items-center justify-center w-9 h-9 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/50 shrink-0">
                    <Bell className={`w-4 h-4 ${unreadNotificationCount && unreadNotificationCount > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                    {unreadNotificationCount !== undefined && unreadNotificationCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground">
                        {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                      </Badge>
                    )}
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-primary" />
                      Notifications
                      {unreadNotificationCount !== undefined && unreadNotificationCount > 0 && (
                        <Badge className="ml-2 bg-primary text-primary-foreground">
                          {unreadNotificationCount}
                        </Badge>
                      )}
                    </DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-[60vh]">
                    <NotificationsList embedded />
                  </ScrollArea>
                </DialogContent>
              </Dialog>

              {/* Messages Button */}
              <Dialog open={messagesOpen} onOpenChange={(open) => {
                setMessagesOpen(open);
                if (!open) {
                  setShowNewMessageView(false);
                  setInChatView(false);
                }
              }}>
                <DialogTrigger asChild>
                  <div className="relative cursor-pointer transition-colors flex items-center justify-center w-9 h-9 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/50 shrink-0">
                    <MessageCircle className={`w-4 h-4 ${unreadMessagesCount > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                    {unreadMessagesCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-destructive text-destructive-foreground">
                        {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                      </Badge>
                    )}
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-md" hideCloseButton>
                  {!inChatView && (
                    <DialogHeader className="flex flex-row items-center justify-between space-y-0">
                      <DialogTitle className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-primary" />
                        Messages
                        {unreadMessagesCount > 0 && (
                          <Badge className="ml-2 bg-destructive text-destructive-foreground">
                            {unreadMessagesCount}
                          </Badge>
                        )}
                      </DialogTitle>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowNewMessageView(true)}
                          className="flex items-center justify-center h-8 w-8 rounded-md bg-muted hover:bg-muted/80 text-foreground transition-colors"
                          title="New message"
                        >
                          <PenSquare className="w-4 h-4" />
                        </button>
                        <DialogClose asChild>
                          <button
                            className="flex items-center justify-center h-8 w-8 rounded-md bg-muted hover:bg-muted/80 text-foreground transition-colors"
                            aria-label="Close"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </DialogClose>
                      </div>
                    </DialogHeader>
                  )}

                  <DirectMessages 
                    embedded 
                    showNewMessageView={showNewMessageView}
                    onNewMessageViewChange={setShowNewMessageView}
                    onInChatViewChange={setInChatView}
                  />
                </DialogContent>
              </Dialog>

              {/* Friends Button */}
              <FriendsList open={friendsListOpen} onOpenChange={setFriendsListOpen}>
                <div className="cursor-pointer transition-colors flex items-center justify-center gap-1.5 px-3 h-9 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/50 shrink-0">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{friends?.length || 0}</span>
                </div>
              </FriendsList>

              {/* Add Friend Button */}
              <Dialog open={addFriendOpen} onOpenChange={(open) => {
                setAddFriendOpen(open);
                if (open && !hasClickedAddFriend) {
                  setHasClickedAddFriend(true);
                  localStorage.setItem('hasClickedAddFriend', 'true');
                }
              }}>
                <DialogTrigger asChild>
                  <div className={`cursor-pointer transition-colors flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${
                    hasClickedAddFriend 
                      ? 'bg-secondary/30 border border-border hover:bg-secondary/50' 
                      : 'bg-primary/20 border-2 border-primary animate-pulse hover:bg-primary/30'
                  }`}>
                    <UserPlus className={`w-4 h-4 ${hasClickedAddFriend ? 'text-muted-foreground' : 'text-primary'}`} />
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-primary" />
                      Add Friend
                    </DialogTitle>
                  </DialogHeader>
                  <div className="pt-2">
                    <UserSearch />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </PageHeader>

      <PageBody>
        <main className="container max-w-2xl mx-auto px-4 py-2 space-y-4">
          {/* Pending Friend Requests */}
          <PendingFriendRequests />

          <section>
            <div className="relative p-3 sm:p-4 border border-border rounded-lg bg-card z-10 min-h-[200px]">
              <FriendsFeed />
            </div>
          </section>
        </main>
      </PageBody>

      <BottomNav />
    </PageLayout>
  );
};

export default FriendsJournals;
