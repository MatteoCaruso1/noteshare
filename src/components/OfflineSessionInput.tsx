import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLogOfflineSession } from '@/hooks/useSessions';
import { useFriends } from '@/hooks/useFriendships';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CollaboratorPicker } from '@/components/CollaboratorPicker';
import { Clock, Calendar, Plus, X } from 'lucide-react';

export function OfflineSessionInput() {
  const { profile } = useAuth();
  const logSession = useLogOfflineSession();
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('30');
  const [noteText, setNoteText] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>([]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = () => {
    if (!profile) return;

    const durationMinutes = parseInt(duration) || 30;
    
    logSession.mutate(
      {
        userId: profile.id,
        date,
        durationMinutes,
        noteText: noteText || undefined,
        tags: tags.length > 0 ? tags : undefined,
        collaboratorIds: collaboratorIds.length > 0 ? collaboratorIds : undefined,
      },
      {
        onSuccess: () => {
          setDate(new Date().toISOString().split('T')[0]);
          setDuration('30');
          setNoteText('');
          setTags([]);
          setCollaboratorIds([]);
          setIsOpen(false);
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Clock className="w-4 h-4 mr-2" />
          Log Past Session
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Past Practice Session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {/* Date */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Date
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Duration (minutes)
            </label>
            <div className="flex gap-2">
              {['15', '30', '45', '60', '90'].map((mins) => (
                <Button
                  key={mins}
                  type="button"
                  variant={duration === mins ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDuration(mins)}
                >
                  {mins}m
                </Button>
              ))}
              <Input
                type="number"
                placeholder="Custom"
                value={!['15', '30', '45', '60', '90'].includes(duration) ? duration : ''}
                onChange={(e) => setDuration(e.target.value)}
                className="w-20"
                min="1"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              What did you practice? (optional)
            </label>
            <Textarea
              placeholder="Scales, sight-reading, working on a new piece..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Tags (optional)
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Add tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1"
              />
              <Button variant="outline" onClick={handleAddTag} type="button">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Collaborators */}
          <div className="border-t border-border pt-4">
            <CollaboratorPicker
              selectedIds={collaboratorIds}
              onSelect={setCollaboratorIds}
              label="Tag Collaborators (optional)"
            />
          </div>

          <Button
            className="w-full bg-gradient-primary text-primary-foreground"
            onClick={handleSubmit}
            disabled={logSession.isPending || !duration}
          >
            Log Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
