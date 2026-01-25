import { memo, useMemo } from 'react';
import { NoteWithAuthor } from '@/types';
import { Clock, Music, Mic } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Background style presets
export const CARD_STYLES = [
  { id: 'dark', name: 'Dark', bgClass: 'bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900', textClass: 'text-white', accentClass: 'text-primary' },
  { id: 'midnight', name: 'Midnight', bgClass: 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900', textClass: 'text-white', accentClass: 'text-indigo-400' },
  { id: 'sunset', name: 'Sunset', bgClass: 'bg-gradient-to-br from-orange-600 via-rose-600 to-purple-700', textClass: 'text-white', accentClass: 'text-orange-200' },
  { id: 'ocean', name: 'Ocean', bgClass: 'bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-800', textClass: 'text-white', accentClass: 'text-cyan-200' },
  { id: 'forest', name: 'Forest', bgClass: 'bg-gradient-to-br from-emerald-700 via-green-800 to-teal-900', textClass: 'text-white', accentClass: 'text-emerald-300' },
  { id: 'lavender', name: 'Lavender', bgClass: 'bg-gradient-to-br from-purple-600 via-violet-700 to-purple-800', textClass: 'text-white', accentClass: 'text-purple-200' },
  { id: 'cream', name: 'Cream', bgClass: 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50', textClass: 'text-zinc-800', accentClass: 'text-orange-600' },
  { id: 'minimal', name: 'Minimal', bgClass: 'bg-white', textClass: 'text-zinc-900', accentClass: 'text-primary' },
] as const;

export type CardStyleId = typeof CARD_STYLES[number]['id'];

interface ShareableNoteCardProps {
  note: NoteWithAuthor;
  styleId: CardStyleId;
  audioToInclude: number[]; // indices of audio files to include
  className?: string;
}

export const ShareableNoteCard = memo(function ShareableNoteCard({
  note,
  styleId,
  audioToInclude,
  className,
}: ShareableNoteCardProps) {
  const style = CARD_STYLES.find(s => s.id === styleId) || CARD_STYLES[0];
  const isPracticeSession = !!note.session_id;
  
  // Calculate session duration
  const sessionDuration = useMemo(() => {
    if (!note.session?.started_at || !note.session?.ended_at) return null;
    
    const start = new Date(note.session.started_at).getTime();
    const end = new Date(note.session.ended_at).getTime();
    const pausedMs = note.session.paused_duration_ms || 0;
    const activeDurationMs = (end - start) - pausedMs;
    const durationMinutes = Math.round(activeDurationMs / 60000);
    
    if (durationMinutes < 60) {
      return `${durationMinutes} min`;
    }
    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }, [note.session?.started_at, note.session?.ended_at, note.session?.paused_duration_ms]);

  // Strip HTML for plain text display
  const plainTextContent = useMemo(() => {
    if (!note.text_content) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = note.text_content;
    return tmp.textContent || tmp.innerText || '';
  }, [note.text_content]);

  // Get audio files to display
  const audioFiles = useMemo(() => {
    return (note.audio_files || [])
      .map((url, idx) => ({
        url,
        name: note.audio_file_names?.[idx] || `Recording ${idx + 1}`,
        included: audioToInclude.includes(idx),
      }))
      .filter(a => a.included);
  }, [note.audio_files, note.audio_file_names, audioToInclude]);

  const hasImages = (note.image_files?.length || 0) > 0;

  return (
    <div
      className={cn(
        'relative w-full aspect-[9/16] rounded-2xl overflow-hidden p-6 flex flex-col',
        style.bgClass,
        style.textClass,
        className
      )}
    >
      {/* Top Section - Type & Time */}
      <div className="flex items-center justify-between mb-4">
        <div className={cn('flex items-center gap-2 text-sm font-medium', style.accentClass)}>
          {isPracticeSession ? (
            <>
              <Clock className="w-4 h-4" />
              <span>Practice Session</span>
            </>
          ) : (
            <>
              <Music className="w-4 h-4" />
              <span>Quick Note</span>
            </>
          )}
        </div>
        <span className="text-xs opacity-70">
          {format(new Date(note.created_at), 'MMM d, yyyy')}
        </span>
      </div>

      {/* Duration Badge (for practice sessions) */}
      {isPracticeSession && sessionDuration && (
        <div className="mb-4">
          <div className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-full text-2xl font-bold',
            style.id === 'cream' || style.id === 'minimal' ? 'bg-zinc-100' : 'bg-white/10'
          )}>
            <Clock className="w-5 h-5" />
            <span>{sessionDuration}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center">
        {/* Text Content */}
        {plainTextContent && (
          <div className="mb-4">
            <p className={cn(
              'text-lg leading-relaxed',
              plainTextContent.length > 150 ? 'text-base' : 'text-xl'
            )}>
              {plainTextContent.length > 280 
                ? plainTextContent.slice(0, 280) + '...' 
                : plainTextContent}
            </p>
          </div>
        )}

        {/* Audio Files */}
        {audioFiles.length > 0 && (
          <div className="space-y-2 mb-4">
            {audioFiles.map((audio, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl',
                  style.id === 'cream' || style.id === 'minimal' ? 'bg-zinc-100' : 'bg-white/10'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  style.id === 'cream' || style.id === 'minimal' ? 'bg-primary/10' : 'bg-white/20'
                )}>
                  <Mic className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{audio.name}</p>
                  <p className="text-xs opacity-60">Audio Recording</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Image indicator */}
        {hasImages && (
          <div className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mb-4 self-start',
            style.id === 'cream' || style.id === 'minimal' ? 'bg-zinc-100' : 'bg-white/10'
          )}>
            📸 {note.image_files!.length} photo{note.image_files!.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Bottom Branding */}
      <div className="mt-auto pt-4 border-t border-current/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
              style.id === 'cream' || style.id === 'minimal' ? 'bg-primary text-primary-foreground' : 'bg-white/20'
            )}>
              n
            </div>
            <span className="font-semibold text-sm">noteshare</span>
          </div>
          <span className="text-xs opacity-50">Practice your way</span>
        </div>
      </div>
    </div>
  );
});
