import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, Wand2, BookOpen, Copy, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTodaysFocus } from '@/hooks/useDailyFocus';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const DAILY_LIMIT = 4;

export function GetInspiredSection() {
  const [showMenu, setShowMenu] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [instrument, setInstrument] = useState('');
  const [level, setLevel] = useState('');
  const [genre, setGenre] = useState('');
  const [practiceType, setPracticeType] = useState('');
  const [result, setResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const { focus } = useTodaysFocus();
  const { profile } = useAuth();

  const handleGenerate = async () => {
    setIsGenerating(true);
    setResult('');

    try {
      let recentNotes: string[] = [];
      if (profile?.id) {
        const { data: notes } = await supabase
          .from('notes')
          .select('text_content')
          .eq('author_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(20);
        if (notes) {
          recentNotes = notes
            .map(n => n.text_content)
            .filter((t): t is string => !!t && t.trim().length > 0);
        }
      }

      const { data, error } = await supabase.functions.invoke('generate-routine', {
        body: {
          instrument,
          level,
          genre,
          practiceType,
          existingRoutine: focus?.focus_text || '',
          recentNotes,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        if (data.remaining !== undefined) setRemaining(data.remaining);
        return;
      }

      setResult(data.routine || 'No routine generated.');
      if (data.remaining !== undefined) setRemaining(data.remaining);
    } catch (err: any) {
      console.error('Generate routine error:', err);
      toast.error('Failed to generate routine. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 rounded-full border-primary/30 text-primary hover:bg-primary/10"
        onClick={() => setShowMenu(true)}
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span className="text-xs">Get Inspired</span>
      </Button>

      {/* Menu dialog */}
      <Dialog open={showMenu} onOpenChange={setShowMenu}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Get Inspired
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => {
                setShowMenu(false);
                setShowGenerator(true);
              }}
            >
              <Wand2 className="h-4 w-4" />
              Generate a Practice Routine
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 opacity-60 cursor-not-allowed"
              disabled
            >
              <BookOpen className="h-4 w-4" />
              Find Personalized Training Content
              <Badge variant="secondary" className="ml-auto text-xs">Coming Soon</Badge>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generator dialog */}
      <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Generate a Practice Routine
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Instrument</label>
              <Textarea
                value={instrument}
                onChange={e => setInstrument(e.target.value)}
                placeholder="e.g., Piano, Guitar, Violin, Drums"
                className="min-h-[40px] resize-none"
                rows={1}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Current Level</label>
              <Textarea
                value={level}
                onChange={e => setLevel(e.target.value)}
                placeholder="e.g., Beginner, Intermediate, Advanced, 3 years experience"
                className="min-h-[40px] resize-none"
                rows={1}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Genre</label>
              <Textarea
                value={genre}
                onChange={e => setGenre(e.target.value)}
                placeholder="e.g., Jazz, Classical, Rock, Blues, Pop"
                className="min-h-[40px] resize-none"
                rows={1}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Ideal Practice Type</label>
              <Textarea
                value={practiceType}
                onChange={e => setPracticeType(e.target.value)}
                placeholder="e.g., Technical drills, Creative exploration, Repertoire focused"
                className="min-h-[40px] resize-none"
                rows={1}
              />
            </div>

            <div className="space-y-1.5">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || remaining === 0}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Routine
                  </>
                )}
              </Button>
              {remaining !== null && (
                <p className="text-xs text-muted-foreground text-center">
                  {remaining} of {DAILY_LIMIT} generations remaining today
                </p>
              )}
            </div>

            {result && (
              <div className="space-y-2">
                <div className="rounded-lg border bg-muted/50 p-4 text-sm whitespace-pre-wrap leading-relaxed">
                  {result}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="gap-2"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy to Clipboard'}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
