import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { BottomNav } from '@/components/BottomNav';
import { UserSearch } from '@/components/UserSearch';
import { FriendsFeed } from '@/components/FriendsFeed';
import { PendingFriendRequests } from '@/components/PendingFriendRequests';
import { DirectMessages } from '@/components/DirectMessages';
import { FriendsList } from '@/components/FriendsList';
import { useFriends } from '@/hooks/useFriendships';
import { Users, ChevronRight } from 'lucide-react';

const FriendsJournals = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: friends } = useFriends();

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Page Header - Clickable to see friends list */}
      <div className="container max-w-2xl mx-auto px-4 pt-4 pb-2">
        <FriendsList>
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
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </FriendsList>
      </div>

      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Pending Friend Requests */}
        <PendingFriendRequests />

        {/* User Search */}
        <UserSearch />

        {/* Direct Messages */}
        <DirectMessages />

        {/* Friends Feed */}
        <div className="pt-2">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>Friends' Notes</span>
          </h2>
          <FriendsFeed />
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default FriendsJournals;
