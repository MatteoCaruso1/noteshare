import { useState, useLayoutEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePublicNotes } from '@/hooks/usePublicNotes';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { useFriends, useRemoveFriend, useIsFriendMuted, useMuteFriend, useUnmuteFriend } from '@/hooks/useFriendships';
import { BottomNav } from '@/components/BottomNav';
import { PageLayout, PageHeader, PageBody } from '@/components/PageLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DirectMessages } from '@/components/DirectMessages';
import { ArrowLeft, User, MapPin, Flame, MessageCircle, UserMinus, VolumeX, Volume2, Shield } from 'lucide-react';
import { Profile } from '@/types';
import { Timeline, LOAD_MORE_COUNT } from '@/components/Timeline';
import { StreakTintedName } from '@/components/StreakTintedName';

// Noteshare Team profile ID (Matteo)
const NOTESHARE_TEAM_PROFILE_ID = '9d8991fb-b065-415c-90f1-96b418ae23a2';


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
  const { profile: myProfile } = useAuth();
  const { data: profile, isLoading, error } = usePublicProfile(id, username);
  const { data: notes, isLoading: notesLoading } = usePublicNotes(profile?.id);
  const { data: friends } = useFriends();
  const removeFriend = useRemoveFriend();
  const isMuted = useIsFriendMuted(profile?.id);
  const muteFriend = useMuteFriend();
  const unmuteFriend = useUnmuteFriend();
  const [displayCount, setDisplayCount] = useState(10);
  const [messagesOpen, setMessagesOpen] = useState(false);
  
  // Check if the profile user is a friend
  const isFriend = friends?.some(f => f.id === profile?.id);
  
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
  
  // Get signed URL for avatar
  const { signedUrl: signedAvatar } = useSignedUrl(profile?.avatar);
  
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
        <BottomNav />
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
              <Button onClick={() => navigate('/friends')}>Go to Friends</Button>
            </Card>
          </div>
        </PageBody>
        <BottomNav />
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
                {signedAvatar ? (
                  <img 
                    src={signedAvatar} 
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
                {profile.id === NOTESHARE_TEAM_PROFILE_ID && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge className="text-xs py-0.5 px-2 gap-1 bg-primary/15 text-primary border-primary/30 w-fit cursor-default">
                          <Shield className="w-3 h-3" />
                          Noteshare Team
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Noteshare Creator</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
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
              <div className="flex flex-wrap gap-2">
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
            <Timeline 
              notes={notes || []} 
              loading={notesLoading}
              displayCount={displayCount}
              onLoadMore={handleLoadMore}
            />
          </div>
        </div>
      </PageBody>

      <BottomNav />
    </PageLayout>
  );
};

export default PublicProfile;
