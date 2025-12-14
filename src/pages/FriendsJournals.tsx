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
import { Users } from 'lucide-react';

const FriendsJournals = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: friends } = useFriends();
  const [feedSearchQuery, setFeedSearchQuery] = useState('');
  
  // Check if we should open the friends list (coming back from a profile)
  const [friendsListOpen, setFriendsListOpen] = useState(false);
  
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
      {/* Page Header - Clickable to see friends list */}
      <div className="container max-w-2xl mx-auto px-4 pt-4 pb-2">
        <FriendsList open={friendsListOpen} onOpenChange={setFriendsListOpen}>
          <div className="flex items-center gap-3 cursor-pointer hover:bg-secondary/30 -mx-2 px-2 py-2 rounded-lg transition-colors group">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl font-semibold">Friends</h1>
              <p className="text-xs text-muted-foreground">
                {friends?.length || 0} friends · Tap to view
              </p>
            </div>
          </div>
        </FriendsList>
      </div>

      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Pending Friend Requests */}
        <PendingFriendRequests />

        {/* User Search */}
        <UserSearch />

        {/* Notifications (Mentions appear here) */}
        <NotificationsList />

        {/* Direct Messages */}
        <DirectMessages />

        {/* Friends Feed */}
        <div className="pt-2">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold">Friends' Notes</h2>
            <div className="flex-1 max-w-xs">
              <TimelineSearch onSearch={setFeedSearchQuery} />
            </div>
          </div>
          {feedSearchQuery && (
            <p className="text-sm text-muted-foreground mb-3">
              Searching for "{feedSearchQuery}"
            </p>
          )}
          <FriendsFeed searchQuery={feedSearchQuery} />
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default FriendsJournals;
