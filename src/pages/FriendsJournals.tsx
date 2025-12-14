import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { BottomNav } from '@/components/BottomNav';
import { UserSearch } from '@/components/UserSearch';
import { FriendsFeed } from '@/components/FriendsFeed';
import { PendingFriendRequests } from '@/components/PendingFriendRequests';
import { DirectMessages } from '@/components/DirectMessages';
import { useFriends } from '@/hooks/useFriendships';
import { Users } from 'lucide-react';

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
      {/* Page Header */}
      <div className="container max-w-2xl mx-auto px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold">Friends</h1>
            <p className="text-xs text-muted-foreground">
              {friends?.length || 0} friends
            </p>
          </div>
        </div>
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
