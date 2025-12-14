import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BottomNav } from '@/components/BottomNav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Music2, Disc3, Users, MapPin } from 'lucide-react';
import { Profile } from '@/types';

function usePublicProfile(profileId: string | undefined) {
  return useQuery({
    queryKey: ['public-profile', profileId],
    queryFn: async () => {
      if (!profileId) throw new Error('Profile ID required');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!profileId,
  });
}

const PublicProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile: myProfile } = useAuth();
  const { data: profile, isLoading, error } = usePublicProfile(id);
  
  // Check if we came from the friends list
  const fromFriendsList = location.state?.fromFriendsList;
  
  const handleBack = () => {
    if (fromFriendsList) {
      // Navigate back to friends page and tell it to open the friends list
      navigate('/friends', { state: { openFriendsList: true } });
    } else {
      navigate(-1);
    }
  };

  // If viewing own profile, redirect to profile page
  if (myProfile?.id === id) {
    navigate('/profile');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container max-w-2xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-muted rounded-xl" />
            <div className="h-32 bg-muted rounded-xl" />
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container max-w-2xl mx-auto px-4 py-6">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Card className="p-8 text-center">
            <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="font-semibold text-lg">Profile not found</h2>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-2xl mx-auto px-4 py-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={handleBack} className="mb-4 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        {/* Profile Header */}
        <Card className="p-6 bg-card border-border mb-4">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="w-20 h-20 border-2 border-primary/20">
              <AvatarImage src={profile.avatar || ''} />
              <AvatarFallback className="text-2xl">
                <User className="w-10 h-10" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate">{profile.name}</h1>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
              {profile.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" /> {profile.location}
                </p>
              )}
            </div>
          </div>

          {/* Open to Collaborate */}
          {profile.open_to_collaborate && (
            <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20 mb-4">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Open to collaborate</span>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">About</h3>
              <p className="text-sm">{profile.bio}</p>
            </div>
          )}

          {/* Instruments */}
          {profile.instruments && profile.instruments.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Music2 className="w-4 h-4" /> Instruments
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.instruments.map((instrument) => (
                  <Badge key={instrument} variant="secondary">
                    {instrument}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Genres */}
          {profile.genres && profile.genres.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Disc3 className="w-4 h-4" /> Genres
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.genres.map((genre) => (
                  <Badge key={genre} variant="outline">
                    {genre}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Stats Hidden Notice */}
        <Card className="p-4 bg-muted/30 border-border text-center">
          <p className="text-sm text-muted-foreground">
            Practice stats are private
          </p>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default PublicProfile;
