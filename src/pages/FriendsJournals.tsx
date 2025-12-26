import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BottomNav } from '@/components/BottomNav';
import { UserSearch } from '@/components/UserSearch';
import { FriendsFeed } from '@/components/FriendsFeed';
import { PendingFriendRequests } from '@/components/PendingFriendRequests';
import { DirectMessages } from '@/components/DirectMessages';
import { FriendsList } from '@/components/FriendsList';
import { NotificationsList } from '@/components/NotificationsList';
import { TimelineSearch } from '@/components/TimelineSearch';
import { useFriends } from '@/hooks/useFriendships';
import { useUnreadNotificationCount, useNotifications } from '@/hooks/useNotifications';
import { useConversations } from '@/hooks/useMessages';
import { Users, Bell, MessageCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
    <div className="min-h-screen bg-background pb-20">
      {/* Page Header with Search */}
      <div className="container max-w-2xl mx-auto px-4 pt-4 pb-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg sm:text-xl font-semibold shrink-0">Friends</h1>
          <div className="flex items-center gap-2 flex-1 justify-end">
            <FriendsList open={friendsListOpen} onOpenChange={setFriendsListOpen}>
              <div className="cursor-pointer transition-opacity group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border hover:border-primary/50 shrink-0">
                <Users className="w-4 h-4 text-muted-foreground transition-colors group-hover:text-primary" />
                <span className="text-sm text-muted-foreground group-hover:text-foreground">({friends?.length || 0})</span>
              </div>
            </FriendsList>
            <div className="flex-1 max-w-xs">
              <UserSearch compact />
            </div>
          </div>
        </div>
      </div>

      <main className="container max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Pending Friend Requests */}
        <PendingFriendRequests />

        {/* Notifications Dropdown */}
        <Card className="bg-card border-border">
          <Collapsible open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full p-4 flex items-center justify-between transition-colors rounded-lg group">
                <div className="flex items-center gap-2">
                  <Bell className={`w-5 h-5 transition-colors ${unreadNotificationCount && unreadNotificationCount > 0 ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                  <span className="font-semibold">Notifications</span>
                  {unreadNotificationCount && unreadNotificationCount > 0 && (
                    <Badge className="h-5 px-1.5 text-xs bg-destructive text-destructive-foreground">
                      {unreadNotificationCount}
                    </Badge>
                  )}
                </div>
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${notificationsOpen ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <NotificationsList embedded />
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Messages Dropdown */}
        <Card className="bg-card border-border">
          <Collapsible open={messagesOpen} onOpenChange={setMessagesOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full p-4 flex items-center justify-between transition-colors rounded-lg group">
                <div className="flex items-center gap-2">
                  <MessageCircle className={`w-5 h-5 transition-colors ${unreadMessagesCount > 0 ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                  <span className="font-semibold">Messages</span>
                  {unreadMessagesCount > 0 && (
                    <Badge className="h-5 px-1.5 text-xs bg-destructive text-destructive-foreground">
                      {unreadMessagesCount}
                    </Badge>
                  )}
                </div>
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${messagesOpen ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <DirectMessages embedded />
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Friends Feed */}
        <div className="pt-2">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold">Friends' Notes</h2>
            <div className="flex-1 max-w-xs">
              <TimelineSearch 
                onSearch={setFeedSearchQuery} 
                onFocusDateFilter={setFocusDateFilter}
                focusDate={focusDateFilter}
              />
            </div>
          </div>
          {feedSearchQuery && (
            <p className="text-sm text-muted-foreground mb-3">
              Searching for "{feedSearchQuery}"
            </p>
          )}
          <FriendsFeed searchQuery={feedSearchQuery} focusDateFilter={focusDateFilter} />
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default FriendsJournals;
