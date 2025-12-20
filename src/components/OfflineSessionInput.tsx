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
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>([]);

  const handleSubmit = () => {
    if (!profile) return;

    const durationMinutes = parseInt(duration) || 30;
    
    logSession.mutate(
      {
        userId: profile.id,
        date,
        durationMinutes,
        noteText: noteText || undefined,
        collaboratorIds: collaboratorIds.length > 0 ? collaboratorIds : undefined,
      },
      {
        onSuccess: () => {
          setDate(new Date().toISOString().split('T')[0]);
          setDuration('30');
          setNoteText('');
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
                className="w-24"
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
