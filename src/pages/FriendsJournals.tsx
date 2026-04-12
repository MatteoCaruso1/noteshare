import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
import { Users, Bell, MessageCircle, PenSquare, UserPlus, X, Waypoints } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const FRIENDS_LIST_VIEWED_KEY = 'noteshare_friends_list_viewed';

const FriendsJournals = () => {
  const { user, profile } = useAuth();
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
  const [inChatView, setInChatView] = useState(false);
  
  // Check if we should open the friends list (coming back from a profile)
  const [friendsListOpen, setFriendsListOpen] = useState(false);

  // Persistent highlight for friends list button until first clicked
  const [friendsListViewed, setFriendsListViewed] = useState(() => {
    if (!profile?.id) return true; // default to no pulse if no profile yet
    try {
      return localStorage.getItem(`${FRIENDS_LIST_VIEWED_KEY}_${profile.id}`) === 'true';
    } catch { return false; }
  });

  // Re-check when profile loads
  useEffect(() => {
    if (profile?.id) {
      try {
        const viewed = localStorage.getItem(`${FRIENDS_LIST_VIEWED_KEY}_${profile.id}`) === 'true';
        setFriendsListViewed(viewed);
      } catch { /* ignore */ }
    }
  }, [profile?.id]);

  const handleFriendsListOpenChange = (open: boolean) => {
    setFriendsListOpen(open);
    if (open && !friendsListViewed && profile?.id) {
      try {
        localStorage.setItem(`${FRIENDS_LIST_VIEWED_KEY}_${profile.id}`, 'true');
      } catch { /* ignore */ }
      setFriendsListViewed(true);
    }
  };
  
  // Calculate unread messages count — count unique senders, not total messages
  const unreadMessagesCount = conversations?.filter(c => c.unreadCount > 0).length || 0;
  
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
            <h1 className="text-lg sm:text-xl font-semibold shrink-0">Social</h1>
            <div className="flex items-center gap-2 flex-1 justify-end">
              {/* Groups Navigation Button - icon only on mobile */}
              <button
                onClick={() => navigate('/groups')}
                className="cursor-pointer transition-colors flex items-center justify-center gap-1.5 px-2 sm:px-3 h-9 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 shrink-0"
              >
                <Waypoints className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary hidden sm:inline">Groups</span>
              </button>

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
                      <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground">
                        {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                      </Badge>
                    )}
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-md overflow-hidden" hideCloseButton>
                  {!inChatView && (
                    <DialogHeader className="flex flex-row items-center justify-between space-y-0">
                      <DialogTitle className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-primary" />
                        Messages
                        {unreadMessagesCount > 0 && (
                          <Badge className="ml-2 bg-primary text-primary-foreground">
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

              {/* Friends Button - no count, Add Friend is inside FriendsList */}
              <FriendsList open={friendsListOpen} onOpenChange={handleFriendsListOpenChange}>
                <div data-tour="friends-list" className="cursor-pointer transition-colors flex items-center justify-center w-9 h-9 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/50 shrink-0">
                  <Users className="w-4 h-4 text-muted-foreground" />
                </div>
              </FriendsList>
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

      
    </PageLayout>
  );
};

export default FriendsJournals;