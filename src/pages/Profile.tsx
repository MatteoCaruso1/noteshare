import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { getAwardById } from '@/lib/awardUtils';
import { AwardIcon } from '@/components/shared/AwardIcon';
import { StreakTintedName } from '@/components/StreakTintedName';
import { usePracticeStats } from '@/hooks/usePracticeStats';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { getStreakTier, getNextStreakMilestone, STREAK_TIERS, StreakTierInfo } from '@/lib/streakUtils';
import { AWARD_CATEGORIES } from '@/lib/awardUtils';
import { ManagePlansSection } from '@/components/ManagePlansSection';
import { SubscriptionSuccessCelebration } from '@/components/SubscriptionSuccessCelebration';
import { ThemePicker } from '@/components/ThemePicker';
import { isTipsDisabled, setTipsDisabled } from '@/hooks/useProTips';

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
  const queryClient = useQueryClient();
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
  const [localSelectedAward, setLocalSelectedAward] = useState<string | null>((profile as any)?.selected_award || null);
  
  // Weekly goal preference
  const [weeklyGoalDisabled, setWeeklyGoalDisabled] = useState(() => {
    return localStorage.getItem(WEEKLY_GOAL_DISABLED_KEY) === 'true';
  });

  // Pro tips preference
  const [proTipsDisabled, setProTipsDisabled] = useState(() => isTipsDisabled());

  // Get signed URL for avatar
  const { signedUrl: signedAvatar } = useSignedUrl(avatar);

  // Streak milestone dialog state
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [celebratingTier, setCelebratingTier] = useState<StreakTierInfo | null>(null);
  const [celebratingAchievementCount, setCelebratingAchievementCount] = useState(1);
  const [celebratingMilestoneDays, setCelebratingMilestoneDays] = useState<number | undefined>();
  const { data: practiceStats } = usePracticeStats(profile?.id);
  
  // Guard ref to prevent duplicate milestone processing (race condition fix)
  const processingMilestonesRef = useRef<Set<number>>(new Set());

  // Persist which milestones we've shown a dialog for during the CURRENT streak run.
  // Keyed by profile+streak so it auto-resets when the streak changes.
  const getShownKey = (pid: string, streak: number) =>
    `noteshare_streak_dialog_shown_${pid}_${streak}`;

  function getShownMilestones(pid: string, streak: number): Set<number> {
    try {
      const raw = localStorage.getItem(getShownKey(pid, streak));
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  }

  function markMilestoneShown(pid: string, streak: number, milestone: number) {
    const shown = getShownMilestones(pid, streak);
    shown.add(milestone);
    localStorage.setItem(getShownKey(pid, streak), JSON.stringify([...shown]));
  }

  // Check for new streak milestones using atomic backend RPC
  // Claims ALL eligible award-level streak milestones (5, 10, 30, 90, 360)
  // Also clears celebrated milestones above current streak so they can be re-earned
  useEffect(() => {
    if (!profile || !practiceStats) return;
    const currentStreak = practiceStats.currentStreak;
    const celebratedMilestones = profile?.celebrated_streak_milestones || [];
    
    // Clear milestones that are now above current streak (so they can be re-earned later)
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
        
        await refreshProfile();
      };
      
      clearMilestones();
    }
    
    if (currentStreak === 0) return;
    
    // Get all streak award thresholds from the award system (5, 10, 30, 90, 360)
    const streakCategory = AWARD_CATEGORIES.find(c => c.category === 'streak');
    const allStreakThresholds = streakCategory?.tiers.map(t => t.threshold) || [];

    // Milestones already shown as a dialog during THIS streak run (persisted in localStorage)
    const shownThisRun = getShownMilestones(profile.id, currentStreak);
    
    // Find all eligible milestones not yet celebrated AND not already shown this streak run
    const eligibleMilestones = allStreakThresholds.filter(
      threshold => currentStreak >= threshold && 
                   !celebratedMilestones.includes(threshold) &&
                   !shownThisRun.has(threshold) &&
                   !processingMilestonesRef.current.has(threshold)
    );
    
    if (eligibleMilestones.length === 0) return;
    
    // Claim all eligible milestones, show dialog for highest
    const claimAllMilestones = async () => {
      eligibleMilestones.forEach(m => processingMilestonesRef.current.add(m));
      
      let highestClaimedMilestone: number | null = null;
      let highestClaimedCount = 0;
      
      for (const milestone of eligibleMilestones) {
        // Mark shown BEFORE the RPC to prevent any re-fire from effect re-runs
        markMilestoneShown(profile.id, currentStreak, milestone);

        const { data, error } = await supabase.rpc('claim_streak_milestone', {
          p_profile_id: profile.id,
          p_milestone: milestone,
        });
        
        if (error) {
          console.error('Failed to claim milestone:', milestone, error);
          processingMilestonesRef.current.delete(milestone);
          continue;
        }
        
        const result = data as { claimed: boolean; streak_achievement_counts?: Record<string, number> } | null;
        
        if (result?.claimed) {
          const count = result.streak_achievement_counts?.[String(milestone)] || 1;
          if (highestClaimedMilestone === null || milestone > highestClaimedMilestone) {
            highestClaimedMilestone = milestone;
            highestClaimedCount = count;
          }
        }
        
        processingMilestonesRef.current.delete(milestone);
      }
      
      // Show dialog for the highest newly claimed milestone
      if (highestClaimedMilestone !== null) {
        const tier = getStreakTier(highestClaimedMilestone);
        if (tier.tier !== 'none') {
          setCelebratingTier(tier);
        } else {
          // For milestones not in streakUtils (e.g. 5d), create display info
          setCelebratingTier({
            tier: 'starter',
            label: `${highestClaimedMilestone}d`,
            minDays: highestClaimedMilestone,
            colorClass: 'text-primary',
            textColorClass: 'text-primary',
            bgColorClass: 'bg-primary/10',
            borderColorClass: 'border-primary/30',
            ringColorClass: 'ring-primary/20',
          });
        }
        setCelebratingAchievementCount(highestClaimedCount);
        setCelebratingMilestoneDays(highestClaimedMilestone);
        setMilestoneDialogOpen(true);
        await refreshProfile();
      }
    };
    
    claimAllMilestones();
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
                  <h2 className="text-xl font-semibold">
                    <StreakTintedName
                      name={profile?.name || ''}
                      streakDays={practiceStats?.currentStreak || 0}
                      bestAchievedMilestone={(() => {
                        const counts = (profile?.streak_achievement_counts || {}) as Record<string, number>;
                        const milestones = Object.keys(counts).map(Number).filter(m => counts[String(m)] > 0);
                        return milestones.length > 0 ? Math.max(...milestones) : 0;
                      })()}
                      achievementCount={(() => {
                        const counts = (profile?.streak_achievement_counts || {}) as Record<string, number>;
                        const milestones = Object.keys(counts).map(Number).filter(m => counts[String(m)] > 0);
                        const best = milestones.length > 0 ? Math.max(...milestones) : 0;
                        return best > 0 ? (counts[String(best)] || 1) : 0;
                      })()}
                      selectedAward={localSelectedAward}
                      streakAchievementCounts={(profile?.streak_achievement_counts || {}) as Record<string, number>}
                    />
                  </h2>
                  <p className="text-sm text-muted-foreground">@{profile?.username}</p>
                  {/* Noteshare Creator badge - temporarily hidden */}
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
              bestMonthDays={practiceStats.bestMonthDays}
              bestCompletedYearPct={practiceStats.bestCompletedYearPct}
              weeklyGoalsMetCount={practiceStats.weeklyGoalsMetCount}
              selectedAward={localSelectedAward}
              achievementCounts={(profile?.streak_achievement_counts || {}) as Record<string, number>}
              onAwardSelected={(awardId) => {
                setLocalSelectedAward(awardId);
                refreshProfile();
                // Invalidate notes cache so the award icon updates on the home/practice page
                queryClient.invalidateQueries({ queryKey: ['notes'] });
                queryClient.invalidateQueries({ queryKey: ['friends-notes'] });
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
                      <Badge key={genre} variant="secondary" className="text-xs">
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

                {/* Pro Tips Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="pro-tips-toggle" className="text-sm font-medium">
                      Feature Tips
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Show helpful tips every few logins
                    </p>
                  </div>
                  <Switch
                    id="pro-tips-toggle"
                    checked={!proTipsDisabled}
                    onCheckedChange={(checked) => {
                      setProTipsDisabled(!checked);
                      setTipsDisabled(!checked);
                      toast.success(checked ? 'Feature tips enabled' : 'Feature tips disabled');
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
          milestoneDays={celebratingMilestoneDays}
        />
      )}
    </PageLayout>
  );
};

export default Profile;
