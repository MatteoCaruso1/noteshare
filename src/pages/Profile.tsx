import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { PageLayout, PageHeader, PageBody } from '@/components/PageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TapTooltip } from '@/components/shared/TapTooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { INSTRUMENTS, GENRES } from '@/types';
import { LogOut, User, Settings, Camera, BookOpen, TrendingUp, Sparkles, Music, Target, Palette, Share } from 'lucide-react';
import { HelpTipsDialog } from '@/components/HelpTipsDialog';
import { usePremium } from '@/contexts/PremiumContext';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { PracticeStats } from '@/components/PracticeStats';
import { PremiumGate } from '@/components/PremiumGate';
import { FeedbackCard } from '@/components/FeedbackCard';
import { AddToHomescreenInfo } from '@/components/AddToHomescreenInfo';
import { StreakBadges } from '@/components/StreakBadges';
import { StreakMilestoneDialog } from '@/components/StreakMilestoneDialog';
import { AwardsSection } from '@/components/AwardsSection';
import { usePracticeStats } from '@/hooks/usePracticeStats';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { getStreakTier, getNextStreakMilestone, STREAK_TIERS, StreakTierInfo } from '@/lib/streakUtils';
import { ManagePlansSection } from '@/components/ManagePlansSection';
import { SubscriptionSuccessCelebration } from '@/components/SubscriptionSuccessCelebration';
import { ThemePicker } from '@/components/ThemePicker';

const WEEKLY_GOAL_DISABLED_KEY = 'noteshare_weekly_goal_disabled';

// Noteshare Team profile ID (Matteo)
const NOTESHARE_TEAM_PROFILE_ID = '9d8991fb-b065-415c-90f1-96b418ae23a2';

// Pro upgrade button component for profile
function ProUpgradeButton() {
  const { isPremium, openPremiumDialog } = usePremium();
  
  if (isPremium) return null;
  
  return (
    <Button 
      size="sm" 
      variant="hero" 
      onClick={openPremiumDialog}
      className="gap-1 text-xs h-8 px-2 self-start"
    >
      <Sparkles className="h-3 w-3" />
      <span className="hidden sm:inline">Get Noteshare Pro</span>
      <span className="sm:hidden">Get Pro</span>
    </Button>
  );
}

const Profile = () => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { uploadImage } = useMediaUpload();
  const { isPremium } = usePremium();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [avatar, setAvatar] = useState(profile?.avatar || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [instruments, setInstruments] = useState<string[]>(profile?.instruments || []);
  const [genres, setGenres] = useState<string[]>(profile?.genres || []);
  const [saving, setSaving] = useState(false);
  
  // Weekly goal preference
  const [weeklyGoalDisabled, setWeeklyGoalDisabled] = useState(() => {
    return localStorage.getItem(WEEKLY_GOAL_DISABLED_KEY) === 'true';
  });

  // Get signed URL for avatar
  const { signedUrl: signedAvatar } = useSignedUrl(avatar);

  // Streak milestone dialog state
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [celebratingTier, setCelebratingTier] = useState<StreakTierInfo | null>(null);
  const [celebratingAchievementCount, setCelebratingAchievementCount] = useState(1);
  const { data: practiceStats } = usePracticeStats(profile?.id);
  
  // Guard ref to prevent duplicate milestone processing (race condition fix)
  const processingMilestonesRef = useRef<Set<number>>(new Set());
  // Track milestones we've already celebrated in THIS browser session
  // This prevents any re-celebration even across re-renders
  const celebratedThisSessionRef = useRef<Set<number>>(new Set());

  // Check for new streak milestones using atomic backend RPC
  // Also clear celebrated milestones that are now above current streak (so they can be re-earned)
  useEffect(() => {
    if (!profile) return;
    const currentStreak = practiceStats?.currentStreak || 0;
    const celebratedMilestones = profile?.celebrated_streak_milestones || [];
    
    // Clear milestones that are now above current streak (so they can be re-earned later)
    // This allows users to earn the same milestone multiple times across different streaks
    // Never clear milestone 3 — it's a one-time-only lifetime achievement
    const milestonesToClear = celebratedMilestones.filter(
      (milestone: number) => milestone > currentStreak && milestone !== 3
    );
    
    if (milestonesToClear.length > 0) {
      const clearMilestones = async () => {
        const updatedMilestones = celebratedMilestones.filter(
          (m: number) => !milestonesToClear.includes(m)
        );
        
        await supabase
          .from('profiles')
          .update({ celebrated_streak_milestones: updatedMilestones })
          .eq('id', profile.id);
        
        // Refresh profile to get updated state
        await refreshProfile();
      };
      
      clearMilestones();
    }
    
    // Check for new milestone achievements
    if (currentStreak === 0) return;
    const currentTier = getStreakTier(currentStreak);

    // Only celebrate actual tier achievements (not 'none')
    if (currentTier.tier === 'none') return;

    // GUARD 1: Already celebrated in this browser session? Skip
    if (celebratedThisSessionRef.current.has(currentTier.minDays)) {
      return;
    }

    // GUARD 2: Currently processing? Skip
    if (processingMilestonesRef.current.has(currentTier.minDays)) {
      return;
    }

    // Mark as processing IMMEDIATELY (before any async work)
    processingMilestonesRef.current.add(currentTier.minDays);
    
    // Use atomic RPC to claim milestone - backend guarantees no duplicates
    const claimMilestone = async () => {
      const { data, error } = await supabase.rpc('claim_streak_milestone', {
        p_profile_id: profile.id,
        p_milestone: currentTier.minDays,
      });
      
      if (error) {
        console.error('Failed to claim milestone:', error);
        processingMilestonesRef.current.delete(currentTier.minDays);
        return;
      }
      
      // Backend returns { claimed: boolean, streak_achievement_counts: {...}, ... }
      const result = data as { claimed: boolean; streak_achievement_counts?: Record<string, number> } | null;
      
      if (result?.claimed) {
        // Successfully claimed! Get the count for this milestone
        const achievementCount = result.streak_achievement_counts?.[String(currentTier.minDays)] || 1;
        
        // Show dialog with the count and mark as celebrated
        celebratedThisSessionRef.current.add(currentTier.minDays);
        setCelebratingTier(currentTier);
        setCelebratingAchievementCount(achievementCount);
        setMilestoneDialogOpen(true);
        // Refresh profile to get updated counts
        await refreshProfile();
      } else {
        // Already claimed (milestone was in DB) - just mark as celebrated this session
        celebratedThisSessionRef.current.add(currentTier.minDays);
      }
      
      processingMilestonesRef.current.delete(currentTier.minDays);
    };
    
    claimMilestone();
  }, [practiceStats?.currentStreak, profile?.id, profile?.celebrated_streak_milestones, refreshProfile]);

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
      genres
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
      {/* Subscription Success Celebration */}
      <SubscriptionSuccessCelebration />
      {/* Page Title - consistent with other pages */}
      <PageHeader>
        <div className="container max-w-2xl mx-auto px-4 pt-4 pb-2">
          <div className="flex items-center justify-between h-9">
            <h1 className="text-lg sm:text-xl font-semibold">Profile</h1>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  const handle = profile?.username;
                  if (handle) {
                    const url = `https://notesharemusic.com/profile/${handle}`;
                    navigator.clipboard.writeText(url);
                    toast.success('Profile link copied to clipboard!');
                  }
                }}
              >
                <Share className="w-5 h-5" />
              </Button>
              <HelpTipsDialog />
              <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
                <Settings className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={async () => { await signOut(); navigate('/welcome'); }}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
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
                <div className="space-y-1.5">
                  <h2 className="text-xl font-semibold">{profile?.name}</h2>
                  <p className="text-sm text-muted-foreground">@{profile?.username}</p>
                  <div className="flex items-center gap-2">
                    {practiceStats && (
                      <StreakBadges 
                        bestStreak={practiceStats.bestDailyStreak}
                        achievementCounts={(profile?.streak_achievement_counts || {}) as Record<string, number>}
                      />
                    )}
                    {/* Noteshare Creator badge - temporarily hidden */}
                  </div>
                </div>
              )}
            </div>
            {!editing && (
              <ProUpgradeButton />
            )}
          </div>

          {/* Awards - show above About when not editing */}
          {!editing && practiceStats && (
            <AwardsSection
              bestStreak={practiceStats.bestDailyStreak}
              totalNotes={practiceStats.totalNotesCount}
              totalHours={Math.floor(practiceStats.totalAllTimeMinutes / 60)}
              selectedAward={(profile as any)?.selected_award || null}
              onAwardSelected={(awardId) => {
                // Refresh profile to update local state
                refreshProfile();
              }}
            />
          )}

          {/* About Section - combined bio, instruments, and genres */}
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-5 h-5 text-primary" />
              <h3 className="font-medium">About</h3>
            </div>
            {editing ? (
              <div className="space-y-4">
                <Textarea 
                  value={bio} 
                  onChange={e => setBio(e.target.value)} 
                  placeholder="Tell others about yourself and your musical journey..." 
                  rows={3} 
                />
                
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Instruments</p>
                  <div className="flex flex-wrap gap-2">
                    {INSTRUMENTS.map(instrument => (
                      <Badge 
                        key={instrument} 
                        variant={instruments.includes(instrument) ? 'default' : 'secondary'} 
                        className="cursor-pointer"
                        data-selected={instruments.includes(instrument) ? "true" : undefined}
                        onClick={() => toggleInstrument(instrument)}
                        onTouchEnd={(e) => e.currentTarget.blur()}
                      >
                        {instrument}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Genres</p>
                  <div className="flex flex-wrap gap-2">
                    {GENRES.map(genre => (
                      <Badge 
                        key={genre} 
                        variant={genres.includes(genre) ? 'default' : 'secondary'} 
                        className="cursor-pointer"
                        data-selected={genres.includes(genre) ? "true" : undefined}
                        onClick={() => toggleGenre(genre)}
                        onTouchEnd={(e) => e.currentTarget.blur()}
                      >
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {profile?.bio || 'No bio yet. Add one to help others get to know you!'}
                </p>
                
                {((profile?.instruments && profile.instruments.length > 0) || (profile?.genres && profile.genres.length > 0)) && (
                  <div className="flex flex-wrap gap-2">
                    {profile?.instruments?.map(instrument => (
                      <Badge key={instrument} variant="secondary" className="text-xs">
                        {instrument}
                      </Badge>
                    ))}
                    {profile?.genres?.map(genre => (
                      <Badge key={genre} variant="secondary" className="text-xs bg-muted text-muted-foreground">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Practice Stats - hide during editing, premium feature */}
          {!editing && (
            <PremiumGate 
              featureName="Practice Stats" 
              blur={true}
              icon={TrendingUp}
              description="Upgrade to Pro to view detailed practice stats"
            >
              <PracticeStats profileId={profile?.id} />
            </PremiumGate>
          )}

          {/* Themes - separate from Practice Stats so it never gets blurred by the stats gate */}
          {!editing && (
            <Card className="p-4 bg-card border-border">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-primary/60" />
                <h3 className="font-semibold">Themes</h3>
              </div>
              <PremiumGate
                featureName="Themes"
                blur={false}
                showPreview={false}
                icon={Palette}
                description="Upgrade to Pro to gain access to custom themes"
              >
                <ThemePicker />
              </PremiumGate>
            </Card>
          )}

          {/* Manage Plans Section - only in edit mode */}
          {editing && <ManagePlansSection />}

          {/* Practice Preferences - only in edit mode */}
          {editing && (
            <Card className="p-4 bg-card border-border">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-primary" />
                <h3 className="font-medium">Practice Preferences</h3>
              </div>
              <div className="space-y-4">
                {/* Weekly Goal Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="weekly-goal-toggle" className="text-sm font-medium">
                      Weekly Practice Goal Prompt
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Show goal-setting modal on Mondays
                    </p>
                  </div>
                  <Switch
                    id="weekly-goal-toggle"
                    checked={!weeklyGoalDisabled}
                    onCheckedChange={(checked) => {
                      setWeeklyGoalDisabled(!checked);
                      localStorage.setItem(WEEKLY_GOAL_DISABLED_KEY, (!checked).toString());
                      toast.success(checked ? 'Weekly goal prompts enabled' : 'Weekly goal prompts disabled');
                    }}
                  />
                </div>
              </div>
            </Card>
          )}

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

          {/* Feedback Section - hide during editing */}
          {!editing && <FeedbackCard />}

          {/* Add to Homescreen Info - hide during editing */}
          {!editing && <AddToHomescreenInfo />}
        </main>
      </PageBody>

      

      {/* Streak Milestone Dialog */}
      {celebratingTier && (
        <StreakMilestoneDialog
          open={milestoneDialogOpen}
          onOpenChange={setMilestoneDialogOpen}
          tier={celebratingTier}
          streakDays={practiceStats?.currentStreak || 0}
          hasNextMilestone={true}
          achievementCount={celebratingAchievementCount}
        />
      )}
    </PageLayout>
  );
};

export default Profile;
