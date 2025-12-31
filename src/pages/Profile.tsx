import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { PageLayout, PageHeader, PageBody } from '@/components/PageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { INSTRUMENTS, GENRES } from '@/types';
import { LogOut, User, Settings, Camera } from 'lucide-react';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { PracticeStats } from '@/components/PracticeStats';
import { FeedbackCard } from '@/components/FeedbackCard';
import { AddToHomescreenInfo } from '@/components/AddToHomescreenInfo';
import { StreakBadges } from '@/components/StreakBadges';
import { StreakMilestoneDialog } from '@/components/StreakMilestoneDialog';
import { usePracticeStats } from '@/hooks/usePracticeStats';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { getStreakTier, getNextStreakMilestone, STREAK_TIERS, StreakTierInfo } from '@/lib/streakUtils';

const MILESTONE_STORAGE_KEY = 'noteshare_celebrated_milestones';

function getCelebratedMilestones(): number[] {
  try {
    const stored = localStorage.getItem(MILESTONE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setCelebratedMilestone(days: number) {
  const milestones = getCelebratedMilestones();
  if (!milestones.includes(days)) {
    milestones.push(days);
    localStorage.setItem(MILESTONE_STORAGE_KEY, JSON.stringify(milestones));
  }
}

const Profile = () => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { uploadImage } = useMediaUpload();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [avatar, setAvatar] = useState(profile?.avatar || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [instruments, setInstruments] = useState<string[]>(profile?.instruments || []);
  const [genres, setGenres] = useState<string[]>(profile?.genres || []);
  const [openToCollaborate, setOpenToCollaborate] = useState(profile?.open_to_collaborate || false);
  const [saving, setSaving] = useState(false);

  // Get signed URL for avatar
  const { signedUrl: signedAvatar } = useSignedUrl(avatar);

  // Streak milestone dialog state
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [celebratingTier, setCelebratingTier] = useState<StreakTierInfo | null>(null);
  const { data: practiceStats } = usePracticeStats(profile?.id);

  // Check for new streak milestones
  useEffect(() => {
    if (!practiceStats?.currentStreak) return;
    const currentStreak = practiceStats.currentStreak;
    const currentTier = getStreakTier(currentStreak);

    // Only celebrate actual tier achievements (not 'none')
    if (currentTier.tier === 'none') return;
    const celebratedMilestones = getCelebratedMilestones();

    // Check if user just hit this milestone and hasn't celebrated it
    if (currentStreak >= currentTier.minDays && !celebratedMilestones.includes(currentTier.minDays)) {
      setCelebratingTier(currentTier);
      setMilestoneDialogOpen(true);
      setCelebratedMilestone(currentTier.minDays);
    }
  }, [practiceStats?.currentStreak]);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      name,
      username,
      avatar,
      bio,
      instruments,
      genres,
      open_to_collaborate: openToCollaborate
    }).eq('id', profile.id);
    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated!');
      await refreshProfile();
      setEditing(false);
      // Scroll to top after saving
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
    setSaving(false);
  };

  const toggleInstrument = (instrument: string) => {
    if (instruments.includes(instrument)) {
      setInstruments(instruments.filter(i => i !== instrument));
    } else {
      setInstruments([...instruments, instrument]);
    }
  };

  const toggleGenre = (genre: string) => {
    if (genres.includes(genre)) {
      setGenres(genres.filter(g => g !== genre));
    } else {
      setGenres([...genres, genre]);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    const url = await uploadImage(file, profile.id);
    if (url) {
      setAvatar(url);
      // Auto-save avatar immediately so it persists even if user navigates away
      const { error } = await supabase.from('profiles').update({
        avatar: url
      }).eq('id', profile.id);
      if (error) {
        toast.error('Failed to save profile picture');
      } else {
        toast.success('Profile picture updated!');
        await refreshProfile();
      }
    }
  };

  return (
    <PageLayout>
      {/* Page Title - consistent with other pages */}
      <PageHeader>
        <div className="container max-w-2xl mx-auto px-4 pt-4 pb-2">
          <div className="flex items-center justify-between h-9">
            <h1 className="text-lg sm:text-xl font-semibold">Profile</h1>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </PageHeader>

      <PageBody>
        <main className="container max-w-2xl mx-auto px-4 py-2 space-y-6">
          {/* Profile Header */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-20 h-20">
                {signedAvatar ? (
                  <img 
                    src={signedAvatar} 
                    alt={name || 'Profile picture'} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <AvatarFallback>
                    <User className="w-8 h-8" />
                  </AvatarFallback>
                )}
              </Avatar>
              {editing && (
                <label className="absolute bottom-0 right-0 bg-background/80 rounded-full p-1 cursor-pointer border border-border">
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  <Camera className="w-4 h-4 text-muted-foreground" />
                </label>
              )}
            </div>
            <div className="flex-1">
              {editing ? (
                <div className="space-y-2">
                  <Input value={name} onChange={e => setName(e.target.value)} className="text-lg font-semibold" placeholder="Full name" />
                  <Input value={username} onChange={e => setUsername(e.target.value)} className="text-sm" placeholder="Handle (e.g., matteo_caruso)" />
                </div>
              ) : (
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold">{profile?.name}</h2>
                  <p className="text-sm text-muted-foreground">@{profile?.username}</p>
                  {practiceStats && <StreakBadges currentStreak={practiceStats.currentStreak} bestStreak={practiceStats.bestDailyStreak} />}
                </div>
              )}
            </div>
            {!editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>

          {/* Bio */}
          <Card className="p-4 bg-card border-border">
            <h3 className="font-medium mb-2">About</h3>
            {editing ? (
              <Textarea 
                value={bio} 
                onChange={e => setBio(e.target.value)} 
                placeholder="Tell others about yourself and your musical journey..." 
                rows={3} 
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {profile?.bio || 'No bio yet. Add one to help others get to know you!'}
              </p>
            )}
          </Card>

          {/* Instruments */}
          <Card className="p-4 bg-card border-border">
            <h3 className="font-medium mb-3">Instruments</h3>
            <div className="flex flex-wrap gap-2">
              {(editing ? INSTRUMENTS : profile?.instruments || []).map(instrument => (
                <Badge 
                  key={instrument} 
                  variant={instruments.includes(instrument) ? 'default' : 'secondary'} 
                  className={editing ? 'cursor-pointer' : ''} 
                  onClick={editing ? () => toggleInstrument(instrument) : undefined}
                >
                  {instrument}
                </Badge>
              ))}
            </div>
          </Card>

          {/* Genres */}
          <Card className="p-4 bg-card border-border">
            <h3 className="font-medium mb-3">Genres</h3>
            <div className="flex flex-wrap gap-2">
              {(editing ? GENRES : profile?.genres || []).map(genre => (
                <Badge 
                  key={genre} 
                  variant={genres.includes(genre) ? 'default' : 'secondary'} 
                  className={editing ? 'cursor-pointer' : ''} 
                  onClick={editing ? () => toggleGenre(genre) : undefined}
                >
                  {genre}
                </Badge>
              ))}
            </div>
          </Card>

          {/* Open to Collaborate */}
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Open to Collaborate</h3>
                <p className="text-sm text-muted-foreground">Show others you're looking for practice partners</p>
              </div>
              {editing ? (
                <Button
                  variant={openToCollaborate ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOpenToCollaborate(!openToCollaborate)}
                >
                  {openToCollaborate ? 'Yes' : 'No'}
                </Button>
              ) : (
                <Badge variant={profile?.open_to_collaborate ? 'default' : 'secondary'}>
                  {profile?.open_to_collaborate ? 'Yes' : 'No'}
                </Badge>
              )}
            </div>
          </Card>

          {/* Practice Stats */}
          <PracticeStats profileId={profile?.id} />

          {/* Save/Cancel Buttons */}
          {editing && (
            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          )}

          {/* Feedback Section */}
          <FeedbackCard />

          {/* Add to Homescreen Info */}
          <AddToHomescreenInfo />
        </main>
      </PageBody>

      <BottomNav />

      {/* Streak Milestone Dialog */}
      {celebratingTier && (
        <StreakMilestoneDialog
          open={milestoneDialogOpen}
          onOpenChange={setMilestoneDialogOpen}
          tier={celebratingTier}
          streakDays={practiceStats?.currentStreak || 0}
          hasNextMilestone={true}
        />
      )}
    </PageLayout>
  );
};

export default Profile;
