import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { INSTRUMENTS, GENRES, SKILL_LEVELS } from '@/types';
import { LogOut, User, Settings, Camera } from 'lucide-react';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { PracticeStats } from '@/components/PracticeStats';

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
  const [skillLevel, setSkillLevel] = useState(profile?.skill_level || '');
  const [openToCollaborate, setOpenToCollaborate] = useState(profile?.open_to_collaborate || false);
  const [saving, setSaving] = useState(false);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        name,
        username,
        avatar,
        bio,
        instruments,
        genres,
        skill_level: skillLevel,
        open_to_collaborate: openToCollaborate,
      })
      .eq('id', profile.id);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated!');
      await refreshProfile();
      setEditing(false);
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
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Profile & Stats</h1>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Header */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="w-20 h-20">
              <AvatarImage src={avatar || ''} />
              <AvatarFallback>
                <User className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            {editing && (
              <label className="absolute bottom-0 right-0 bg-background/80 rounded-full p-1 cursor-pointer border border-border">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <Camera className="w-4 h-4 text-muted-foreground" />
              </label>
            )}
          </div>
          <div className="flex-1">
            {editing ? (
              <div className="space-y-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-lg font-semibold"
                  placeholder="Full name"
                />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="text-sm"
                  placeholder="Handle (e.g., matteo_caruso)"
                />
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold">{profile?.name}</h2>
                <p className="text-sm text-muted-foreground">@{profile?.username}</p>
              </>
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
              onChange={(e) => setBio(e.target.value)}
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
            {(editing ? INSTRUMENTS : profile?.instruments || []).map((instrument) => (
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
            {(editing ? GENRES : profile?.genres || []).map((genre) => (
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

        {/* Skill Level & Collaboration */}
        <Card className="p-4 bg-card border-border space-y-4">
          <div>
            <h3 className="font-medium mb-3">Skill Level</h3>
            <div className="flex flex-wrap gap-2">
              {SKILL_LEVELS.map((level) => (
                <Badge
                  key={level}
                  variant={skillLevel === level ? 'default' : 'secondary'}
                  className={editing ? 'cursor-pointer' : ''}
                  onClick={editing ? () => setSkillLevel(level) : undefined}
                >
                  {level}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Open to Collaborate</h3>
              <p className="text-sm text-muted-foreground">
                Let others know you're looking for collaborators
              </p>
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

        {/* Save/Cancel Buttons */}
        {editing && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-gradient-primary text-primary-foreground"
              onClick={handleSave}
              disabled={saving}
            >
              Save Changes
            </Button>
          </div>
        )}

        {/* Practice Stats */}
        {!editing && profile && (
          <div className="pt-4">
            <h2 className="text-lg font-semibold mb-4">Your Practice Stats</h2>
            <PracticeStats profileId={profile.id} />
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
