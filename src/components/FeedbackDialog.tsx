import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquareHeart } from 'lucide-react';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [likeMost, setLikeMost] = useState('');
  const [dislikeMost, setDislikeMost] = useState('');
  const [npsScore, setNpsScore] = useState<number | null>(null);

  const handleSubmit = async () => {
    if (!likeMost.trim()) {
      toast({
        title: "Please share what you like",
        description: "We'd love to hear what's working for you!",
        variant: "destructive",
      });
      return;
    }

    if (!dislikeMost.trim()) {
      toast({
        title: "Please share what could be better",
        description: "Honest feedback helps us improve!",
        variant: "destructive",
      });
      return;
    }

    if (!profile?.id) {
      toast({
        title: "Not signed in",
        description: "Please sign in to submit feedback.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Store in database
      const { error: dbError } = await supabase
        .from('feedback')
        .insert({
          user_id: profile.id,
          like_most: likeMost.trim(),
          dislike_most: dislikeMost.trim() || null,
          nps_score: npsScore,
        });

      if (dbError) throw dbError;

      // Send email notification (user info is extracted from JWT server-side)
      await supabase.functions.invoke('send-feedback-email', {
        body: {
          likeMost: likeMost.trim(),
          dislikeMost: dislikeMost.trim() || undefined,
          npsScore: npsScore || undefined,
        },
      });

      toast({
        title: "Thanks — your feedback helps shape Noteshare.",
        description: "We truly appreciate you taking the time.",
      });

      // Reset form and close
      setLikeMost('');
      setDislikeMost('');
      setNpsScore(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <MessageSquareHeart className="w-5 h-5 text-primary" />
            <DialogTitle>Help Shape Noteshare</DialogTitle>
          </div>
          <DialogDescription>
            Your thoughts help me build something musicians actually want. Thanks for being part of this.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Question 1 - Required */}
          <div className="space-y-2">
            <Label htmlFor="like-most" className="text-sm font-medium">
              What do you like most about Noteshare? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="like-most"
              value={likeMost}
              onChange={(e) => setLikeMost(e.target.value)}
              className="min-h-[80px] resize-none"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
          </div>

          {/* Question 2 - Required */}
          <div className="space-y-2">
            <Label htmlFor="dislike-most" className="text-sm font-medium">
              What do you dislike or find confusing? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="dislike-most"
              value={dislikeMost}
              onChange={(e) => setDislikeMost(e.target.value)}
              className="min-h-[80px] resize-none"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
          </div>

          {/* Question 3 - NPS Score */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              How likely are you to recommend Noteshare to a fellow musician?
            </Label>
            <div className="grid grid-cols-10 gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                <Button
                  key={score}
                  type="button"
                  variant={npsScore === score ? "default" : "outline"}
                  size="sm"
                  className="h-8 p-0 text-xs"
                  onClick={() => setNpsScore(score)}
                >
                  {score}
                </Button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Not likely</span>
              <span>Very likely</span>
            </div>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !likeMost.trim() || !dislikeMost.trim()}
            className="w-full"
          >
            {isSubmitting ? 'Sending...' : 'Submit Feedback'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}