import { useState, useLayoutEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePublicNotes } from '@/hooks/usePublicNotes';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { useFriends, useRemoveFriend, useIsFriendMuted, useMuteFriend, useUnmuteFriend, useFriendships, useSendFriendRequest } from '@/hooks/useFriendships';
import { PageLayout, PageHeader, PageBody } from '@/components/PageLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DirectMessages } from '@/components/DirectMessages';
import { ArrowLeft, User, MapPin, Flame, MessageCircle, UserMinus, VolumeX, Volume2, Paintbrush, Share2, UserPlus, Clock, Lock } from 'lucide-react';
import { Profile } from '@/types';
import { Timeline, LOAD_MORE_COUNT } from '@/components/Timeline';
import { StreakTintedName } from '@/components/StreakTintedName';
import { getStreakTier } from '@/lib/streakUtils';
import { toast } from 'sonner';

// Noteshare Team profile ID (Matteo)
const NOTESHARE_TEAM_PROFILE_ID = '9d8991fb-b065-415c-90f1-96b418ae23a2';

const PROFILE_REDIRECT_KEY = 'noteshare_profile_redirect';

// Helper functions to get best achieved milestone from profile
function getBestAchievedMilestone(profile: Profile): number {
  const achievementCounts = profile.streak_achievement_counts || {};
  const achievedMilestones = Object.keys(achievementCounts)
    .map(Number)
    .filter(m => (achievementCounts as Record<string, number>)[String(m)] > 0);
  
  if (achievedMilestones.length > 0) {
    return Math.max(...achievedMilestones);
  }
  
  // Fallback to current streak tier if no achievements recorded
  const currentStreak = profile.current_streak || 0;
  return currentStreak >= 10 ? getStreakTier(currentStreak).minDays : 0;
}

function getBestAchievementCount(profile: Profile): number {
  const bestMilestone = getBestAchievedMilestone(profile);
  if (bestMilestone === 0) return 0;
  
  const achievementCounts = profile.streak_achievement_counts || {};
  return (achievementCounts as Record<string, number>)[String(bestMilestone)] || 1;
}


function usePublicProfile(profileId: string | undefined, username: string | undefined) {
  return useQuery({
    queryKey: ['public-profile', profileId, username],
    queryFn: async () => {
      // Validate inputs
      if (!profileId && !username) {
        throw new Error('Profile ID or username required');
      }
      
      // Validate profileId is not a literal string "undefined"
      if (profileId === 'undefined' || profileId === 'null') {
        throw new Error('Invalid profile ID');
      }

      if (profileId) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profileId)
          .single();
        if (error) throw error;
        return data as Profile;
      }
      if (username) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();
        if (error) throw error;
        return data as Profile;
      }
      throw new Error('Profile ID or username required');
    },
    enabled: (!!profileId && profileId !== 'undefined' && profileId !== 'null') || !!username,
    retry: false, // Don't retry on invalid profile
  });
}

const PublicProfile = () => {
  const { id, username } = useParams<{ id?: string; username?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile: myProfile, user } = useAuth();
  const { data: profile, isLoading, error } = usePublicProfile(id, username);
  const { data: notes, isLoading: notesLoading } = usePublicNotes(profile?.id);
  const { data: friends } = useFriends();
  const { data: friendships } = useFriendships();
  const removeFriend = useRemoveFriend();
  const sendFriendRequest = useSendFriendRequest();
  const isMuted = useIsFriendMuted(profile?.id);
  const muteFriend = useMuteFriend();
  const unmuteFriend = useUnmuteFriend();
  const [displayCount, setDisplayCount] = useState(10);
  const [messagesOpen, setMessagesOpen] = useState(false);
  
  const isLoggedIn = !!user;
  
  // Check if the profile user is a friend
  const isFriend = friends?.some(f => f.id === profile?.id);
  
  // Check friendship status for Add Friend button
  const getFriendshipStatus = () => {
    if (!profile?.id || !myProfile?.id || !friendships) return 'none';
    const friendship = friendships.find(
      f => (f.requester_id === myProfile.id && f.addressee_id === profile.id) ||
           (f.addressee_id === myProfile.id && f.requester_id === profile.id)
    );
    if (!friendship) return 'none';
    if (friendship.status === 'accepted') return 'friends';
    if (friendship.status === 'pending') return 'pending';
    return 'none';
  };
  const friendshipStatus = getFriendshipStatus();
  
  const handleRemoveFriend = () => {
    if (profile?.id) {
      removeFriend.mutate(profile.id, {
        onSuccess: () => navigate('/friends'),
      });
    }
  };

  const handleToggleMute = () => {
    if (!profile?.id) return;
    if (isMuted) {
      unmuteFriend.mutate(profile.id);
    } else {
      muteFriend.mutate(profile.id);
    }
  };
  
  const handleShareProfile = async () => {
    if (!profile) return;
    const cleanUrl = `https://notesharemusic.com/profile/${profile.username}`;
    try {
      await navigator.clipboard.writeText(cleanUrl);
      toast.success('Profile link copied');
    } catch {
      toast.success('Profile link copied');
    }
  };

  const handleAddFriend = () => {
    if (!profile?.id) return;
    sendFriendRequest.mutate(profile.id);
  };

  const handleCreateAccount = () => {
    // Store the profile handle for redirect after auth + FTUE
    if (profile?.username) {
      localStorage.setItem(PROFILE_REDIRECT_KEY, profile.username);
    }
    navigate('/auth');
  };
  
  // Always use signed URL for avatar (works for both logged-in and logged-out via public flag)
  const { signedUrl: avatarUrl } = useSignedUrl(profile?.avatar, !isLoggedIn);
  
  const handleLoadMore = () => {
    setDisplayCount(prev => prev + LOAD_MORE_COUNT);
  };
  
  // Scroll to top instantly on mount
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [id, username]);
  
  // Check if we came from the friends list or a note detail page
  const fromFriendsList = location.state?.fromFriendsList;
  const fromNote = location.state?.fromNote;
  
  const handleBack = () => {
    if (!isLoggedIn) {
      navigate('/welcome');
      return;
    }
    if (fromFriendsList) {
      // Navigate back to friends page and tell it to open the friends list
      navigate('/friends', { state: { openFriendsList: true } });
    } else if (fromNote) {
      // Navigate back to the specific note
      navigate(`/notes/${fromNote}`);
    } else {
      // Default: go back in history, but if that fails, go to friends
      navigate('/friends');
    }
  };

  // If viewing own profile, redirect to profile page
  if (profile && myProfile?.id === profile.id) {
    navigate('/profile');
    return null;
  }

  if (isLoading) {
    return (
      <PageLayout>
        <PageBody>
          <div className="container max-w-2xl mx-auto px-4 py-8">
            <Card className="p-6 bg-card border-border animate-pulse">
              <div className="h-20 bg-muted rounded" />
            </Card>
          </div>
        </PageBody>
      </PageLayout>
    );
  }

  if (error || !profile) {
    return (
      <PageLayout>
        <PageBody>
          <div className="container max-w-2xl mx-auto px-4 py-8">
            <Card className="p-6 bg-card border-border text-center">
              <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
              <p className="text-muted-foreground mb-4">This user doesn't exist or the profile couldn't be loaded.</p>
              <Button onClick={() => navigate(isLoggedIn ? '/friends' : '/welcome')}>
                {isLoggedIn ? 'Go to Friends' : 'Go Home'}
              </Button>
            </Card>
          </div>
        </PageBody>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader>
        <div className="container max-w-2xl mx-auto px-4 pt-6">
          <div className="flex items-center justify-between">
            {/* Back Button */}
            <button 
              onClick={handleBack} 
              className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-secondary/80 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              {/* Create Account CTA for logged-out visitors */}
              {!isLoggedIn && (
                <Button
                  size="sm"
                  className="bg-gradient-primary text-white hover:opacity-90 text-xs"
                  onClick={handleCreateAccount}
                >
                  Create an Account
                </Button>
              )}
            </div>
          </div>
        </div>
      </PageHeader>

      <PageBody>
        <div className="container max-w-2xl mx-auto px-4 py-4 space-y-4">
          {/* Profile Header */}
          <Card className="p-6 bg-card border-border relative">
            {/* Friend Actions - only show if friend */}
            {isFriend && (
              <div className="absolute top-4 right-4 flex items-center gap-1">
                {/* Message Button */}
                <button 
                  onClick={() => setMessagesOpen(true)}
                  className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-secondary/80 transition-colors"
                  aria-label="Send message"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>

                {/* Mute/Unmute Button */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button 
                      className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-secondary/80 transition-colors"
                      aria-label={isMuted ? "Unmute friend" : "Mute friend"}
                    >
                      {isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{isMuted ? 'Unmute' : 'Mute'} {profile?.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {isMuted 
                          ? "Their posts will appear in your feed again."
                          : "Their posts won't show in your feed. You'll stay friends."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleToggleMute}>
                        {isMuted ? 'Unmute' : 'Mute'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Remove Friend Button */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button 
                      className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      aria-label="Remove friend"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove {profile?.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You'll no longer see each other's posts.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleRemoveFriend}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="w-20 h-20 border-2 border-primary/20">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={profile.name || 'Profile picture'} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <AvatarFallback className="text-2xl">
                    <User className="w-10 h-10" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <StreakTintedName 
                    name={profile.name}
                    streakDays={profile.current_streak || 0}
                    bestAchievedMilestone={getBestAchievedMilestone(profile)}
                    achievementCount={getBestAchievementCount(profile)}
                    className="text-xl font-bold truncate"
                  />
                  {(profile.current_streak || 0) > 0 && (
                    <span className="flex items-center gap-1 text-primary text-sm font-medium shrink-0">
                      <Flame className="w-4 h-4" />
                      {profile.current_streak}d
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
                {/* Noteshare Creator badge - temporarily hidden */}
                {profile.location && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {profile.location}
                  </p>
                )}
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">About</h3>
                <p className="text-sm">{profile.bio}</p>
              </div>
            )}

            {/* Combined Instruments & Genres */}
            {((profile.instruments && profile.instruments.length > 0) || (profile.genres && profile.genres.length > 0)) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.instruments?.map((instrument) => (
                  <Badge key={instrument} variant="secondary" className="text-xs">
                    {instrument}
                  </Badge>
                ))}
                {profile.genres?.map((genre) => (
                  <Badge key={genre} variant="secondary" className="text-xs bg-muted text-muted-foreground">
                    {genre}
                  </Badge>
                ))}
              </div>
            )}

            {/* Add Friend Button - show for logged-in non-friends */}
            {isLoggedIn && !isFriend && myProfile?.id !== profile.id && (
              <div className="pt-2">
                {friendshipStatus === 'pending' ? (
                  <Button variant="outline" size="sm" disabled className="gap-1.5 w-full">
                    <Clock className="w-4 h-4" />
                    Request Sent
                  </Button>
                ) : friendshipStatus === 'none' ? (
                  <Button 
                    size="sm" 
                    className="gap-1.5 w-full bg-gradient-primary text-white hover:opacity-90"
                    onClick={handleAddFriend}
                    disabled={sendFriendRequest.isPending}
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Friend
                  </Button>
                ) : null}
              </div>
            )}

            {/* Add Friend CTA for logged-out users */}
            {!isLoggedIn && (
              <div className="pt-2">
                <Button 
                  size="sm" 
                  className="gap-1.5 w-full bg-gradient-primary text-white hover:opacity-90"
                  onClick={handleCreateAccount}
                >
                  <UserPlus className="w-4 h-4" />
                  Add Friend
                </Button>
              </div>
            )}
          </Card>

          {/* Messages Dialog - opens direct chat with this profile */}
          <Dialog open={messagesOpen} onOpenChange={setMessagesOpen}>
            <DialogContent className="max-w-md p-0" hideCloseButton>
              <DirectMessages 
                embedded 
                initialSelectedFriend={profile}
                onClose={() => setMessagesOpen(false)}
              />
            </DialogContent>
          </Dialog>

          {/* Notes Section */}
          <div className="space-y-4">
            <h3 className="font-semibold px-1">Recent Notes</h3>
            
            {/* Logged-out or non-friend: show blurred placeholder */}
            {!isLoggedIn || (!isFriend && myProfile?.id !== profile.id) ? (
              <div className="relative">
                {/* Fake blurred note cards */}
                <div className="space-y-3 filter blur-sm pointer-events-none select-none" aria-hidden="true">
                  {[1, 2, 3].map(i => (
                    <Card key={i} className="p-4 bg-card border-border">
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                        <div className="h-16 bg-muted rounded" />
                      </div>
                    </Card>
                  ))}
                </div>
                {/* Overlay message */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Card className="p-6 bg-card/95 backdrop-blur-sm border-border text-center max-w-xs">
                    <Lock className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="font-medium mb-1">
                      {!isLoggedIn ? 'Sign in to view notes' : 'Add as friend to view notes'}
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                      {!isLoggedIn 
                        ? "Create an account to see what this musician is working on."
                        : "Send a friend request to see their practice notes."}
                    </p>
                    {!isLoggedIn ? (
                      <Button 
                        size="sm"
                        className="bg-gradient-primary text-white hover:opacity-90"
                        onClick={handleCreateAccount}
                      >
                        Create an Account
                      </Button>
                    ) : friendshipStatus === 'none' ? (
                      <Button 
                        size="sm"
                        className="gap-1.5 bg-gradient-primary text-white hover:opacity-90"
                        onClick={handleAddFriend}
                        disabled={sendFriendRequest.isPending}
                      >
                        <UserPlus className="w-4 h-4" />
                        Add Friend
                      </Button>
                    ) : friendshipStatus === 'pending' ? (
                      <Button variant="outline" size="sm" disabled className="gap-1.5">
                        <Clock className="w-4 h-4" />
                        Request Sent
                      </Button>
                    ) : null}
                  </Card>
                </div>
              </div>
            ) : (
              <Timeline 
                notes={notes || []} 
                loading={notesLoading}
                displayCount={displayCount}
                onLoadMore={handleLoadMore}
              />
            )}
          </div>
        </div>
      </PageBody>
    </PageLayout>
  );
};

export default PublicProfile;

// Export constant for use in other files
export { PROFILE_REDIRECT_KEY };
