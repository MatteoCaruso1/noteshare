import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLogOfflineSession } from '@/hooks/useSessions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextarea } from '@/components/RichTextarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clock, Calendar, Play } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { PremiumGate } from '@/components/PremiumGate';

export function OfflineSessionInput() {
  const { profile } = useAuth();
  const logSession = useLogOfflineSession();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('');
  const [noteText, setNoteText] = useState('');

  const handleSubmit = () => {
    if (!profile) return;

    const durationMinutes = parseInt(duration) || 30;
    
    logSession.mutate(
      {
        userId: profile.id,
        date,
        durationMinutes,
        noteText: noteText || undefined,
      },
      {
        onSuccess: () => {
          setDate(new Date().toISOString().split('T')[0]);
          setDuration('');
          setNoteText('');
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
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[calc(100vw-2rem)] sm:max-w-lg w-full overflow-x-hidden box-border" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Log Past Practice Session</DialogTitle>
        </DialogHeader>
        <PremiumGate 
          featureName="Log Past Session" 
          blur={false}
          icon={Play}
          description="Upgrade to Pro to log past practice sessions"
        >
          <div className="space-y-4 pt-4 overflow-x-hidden">
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
                className="w-full max-w-full min-w-0 box-border [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-date-and-time-value]:text-left"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Duration (minutes)
              </label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Enter minutes"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="1"
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                What did you practice?
              </label>
              <RichTextarea
                placeholder=""
                value={noteText}
                onChange={setNoteText}
                rows={3}
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
        </PremiumGate>
      </DialogContent>
    </Dialog>
  );
}
