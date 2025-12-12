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
import { LogOut, User, Settings } from 'lucide-react';

const Profile = () => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
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

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Profile</h1>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Header */}
        <div className="flex items-center gap-4">
          <Avatar className="w-20 h-20">
            <AvatarImage src={profile?.avatar || ''} />
            <AvatarFallback>
              <User className="w-8 h-8" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            {editing ? (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-lg font-semibold"
              />
            ) : (
              <h2 className="text-xl font-semibold">{profile?.name}</h2>
            )}
            <p className="text-sm text-muted-foreground">@{profile?.username}</p>
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
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
