import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { BottomNav } from '@/components/BottomNav';
import { UserSearch } from '@/components/UserSearch';
import { FriendsFeed } from '@/components/FriendsFeed';
import { PendingFriendRequests } from '@/components/PendingFriendRequests';
import { useFriends } from '@/hooks/useFriendships';
import { Heart, Users } from 'lucide-react';

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
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Friends' Journals</h1>
              <p className="text-xs text-muted-foreground">
                {friends?.length || 0} friends
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Purpose Section */}
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
          <div className="flex items-start gap-3">
            <Heart className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-foreground">
                A space to share and celebrate practice progress, mistakes, ideas, and the journey we're on together — <span className="text-primary font-medium">not for virality, but for your inner circle.</span>
              </p>
            </div>
          </div>
        </div>

        {/* Pending Friend Requests */}
        <PendingFriendRequests />

        {/* User Search */}
        <UserSearch />

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
