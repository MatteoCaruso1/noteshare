import { memo, useMemo } from 'react';
import { NoteWithAuthor } from '@/types';
import { Clock, Music, Mic } from 'lucide-react';
import { format, getHours } from 'date-fns';
import { cn } from '@/lib/utils';

// Background style presets - ordered to work well with blue Noteshare logo
export const CARD_STYLES = [
  { id: 'dark', name: 'Dark', bgClass: 'bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900', textClass: 'text-white', mutedClass: 'text-zinc-400' },
  { id: 'midnight', name: 'Midnight', bgClass: 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900', textClass: 'text-white', mutedClass: 'text-indigo-300/70' },
  { id: 'ocean', name: 'Ocean', bgClass: 'bg-gradient-to-br from-cyan-700 via-blue-800 to-indigo-900', textClass: 'text-white', mutedClass: 'text-cyan-100/70' },
  { id: 'forest', name: 'Forest', bgClass: 'bg-gradient-to-br from-emerald-800 via-green-900 to-teal-950', textClass: 'text-white', mutedClass: 'text-emerald-200/70' },
  { id: 'lavender', name: 'Lavender', bgClass: 'bg-gradient-to-br from-purple-700 via-violet-800 to-purple-900', textClass: 'text-white', mutedClass: 'text-purple-200/70' },
  { id: 'sunset', name: 'Sunset', bgClass: 'bg-gradient-to-br from-orange-700 via-rose-700 to-purple-800', textClass: 'text-white', mutedClass: 'text-white/70' },
  { id: 'cream', name: 'Cream', bgClass: 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50', textClass: 'text-zinc-800', mutedClass: 'text-zinc-500' },
  { id: 'minimal', name: 'Minimal', bgClass: 'bg-white', textClass: 'text-zinc-900', mutedClass: 'text-zinc-500' },
] as const;

export type CardStyleId = typeof CARD_STYLES[number]['id'];

interface ShareableNoteCardProps {
  note: NoteWithAuthor;
  styleId: CardStyleId;
  audioToInclude: number[]; // indices of audio files to include
  className?: string;
}

// Get time of day label based on session start time
function getTimeOfDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const hour = getHours(date);
  
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  return 'Evening';
}

// Round minutes to nearest 5, with ~ prefix
function formatApproxDuration(durationMinutes: number): string {
  if (durationMinutes < 5) {
    return `~${durationMinutes} min`;
  }
  const rounded = Math.round(durationMinutes / 5) * 5;
  if (rounded < 60) {
    return `~${rounded} min`;
  }
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  return mins > 0 ? `~${hours}h ${mins}m` : `~${hours}h`;
}

export const ShareableNoteCard = memo(function ShareableNoteCard({
  note,
  styleId,
  audioToInclude,
  className,
}: ShareableNoteCardProps) {
  const style = CARD_STYLES.find(s => s.id === styleId) || CARD_STYLES[0];
  const isPracticeSession = !!note.session_id;
  
  // Get time of day for practice sessions
  const timeOfDay = useMemo(() => {
    if (!isPracticeSession || !note.session?.started_at) return null;
    return getTimeOfDayLabel(note.session.started_at);
  }, [isPracticeSession, note.session?.started_at]);

  // Calculate session duration
  const sessionDuration = useMemo(() => {
    if (!note.session?.started_at || !note.session?.ended_at) return null;
    
    const start = new Date(note.session.started_at).getTime();
    const end = new Date(note.session.ended_at).getTime();
    const pausedMs = note.session.paused_duration_ms || 0;
    const activeDurationMs = (end - start) - pausedMs;
    const durationMinutes = Math.round(activeDurationMs / 60000);
    
    return formatApproxDuration(durationMinutes);
  }, [note.session?.started_at, note.session?.ended_at, note.session?.paused_duration_ms]);

  // Strip HTML for plain text display
  const plainTextContent = useMemo(() => {
    if (!note.text_content) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = note.text_content;
    return tmp.textContent || tmp.innerText || '';
  }, [note.text_content]);

  // Get audio files to display - limit to 1 max
  const audioFile = useMemo(() => {
    const included = (note.audio_files || [])
      .map((url, idx) => ({
        url,
        name: note.audio_file_names?.[idx] || `Recording ${idx + 1}`,
        included: audioToInclude.includes(idx),
      }))
      .filter(a => a.included);
    return included.length > 0 ? included[0] : null;
  }, [note.audio_files, note.audio_file_names, audioToInclude]);

  const hasImages = (note.image_files?.length || 0) > 0;
  const hasAudio = !!audioFile;

  // Dynamically calculate max text length based on what else is displayed
  const truncatedNotes = useMemo(() => {
    if (!plainTextContent) return '';
    
    // Higher base limit now that we have more space
    let maxLength = 200;
    
    // Reduce limit if we have audio or images to display
    if (hasAudio) maxLength -= 30;
    if (hasImages) maxLength -= 25;
    
    // Ensure minimum
    maxLength = Math.max(maxLength, 100);
    
    if (plainTextContent.length > maxLength) {
      // Find last space before limit to avoid cutting words
      const trimmed = plainTextContent.slice(0, maxLength);
      const lastSpace = trimmed.lastIndexOf(' ');
      const cutPoint = lastSpace > maxLength * 0.7 ? lastSpace : maxLength;
      return plainTextContent.slice(0, cutPoint).trim() + '...';
    }
    return plainTextContent;
  }, [plainTextContent, hasAudio, hasImages]);

  return (
    <div
      className={cn(
        'relative w-full aspect-[9/16] rounded-2xl overflow-hidden p-5 flex flex-col',
        style.bgClass,
        style.textClass,
        className
      )}
    >
      {/* Top Section - Type & Date */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-0.5">
          <span>{isPracticeSession ? `${timeOfDay} Practice Session` : 'Quick Note'}</span>
        </div>
        <span className={cn('text-xs', style.mutedClass)}>
          {format(new Date(note.created_at), 'MMMM d, yyyy')}
        </span>
      </div>

      {/* Main Content Area - use flex-1 with overflow hidden */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Duration Section (for practice sessions) */}
        {isPracticeSession && sessionDuration && (
          <div className="mb-3 flex-shrink-0">
            <span className={cn('text-[9px] font-medium uppercase tracking-wider mb-1 block', style.mutedClass)}>
              Duration
            </span>
            <div className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold',
              style.id === 'cream' || style.id === 'minimal' ? 'bg-zinc-100' : 'bg-white/10'
            )}>
              <Clock className="w-3 h-3" />
              <span>{sessionDuration}</span>
            </div>
          </div>
        )}

        {/* Text Content Section - smaller font, tighter spacing */}
        {truncatedNotes && (
          <div className="mb-3 flex-shrink-0">
            <span className={cn('text-[9px] font-medium uppercase tracking-wider mb-1 block', style.mutedClass)}>
              {isPracticeSession ? 'Session Notes' : 'Notes'}
            </span>
            <p className="text-xs leading-snug">
              {truncatedNotes}
            </p>
          </div>
        )}

        {/* Audio File Section - single recording only */}
        {audioFile && (
          <div className="mb-3 flex-shrink-0">
            <span className={cn('text-[9px] font-medium uppercase tracking-wider mb-1 block', style.mutedClass)}>
              Recording
            </span>
            <div
              className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 rounded-xl',
                style.id === 'cream' || style.id === 'minimal' ? 'bg-zinc-100' : 'bg-white/10'
              )}
            >
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                style.id === 'cream' || style.id === 'minimal' ? 'bg-primary/10' : 'bg-white/20'
              )}>
                <Mic className="w-3 h-3" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate">{audioFile.name}</p>
                <p className={cn('text-[9px]', style.mutedClass)}>Audio Recording</p>
              </div>
            </div>
          </div>
        )}

        {/* Image indicator */}
        {hasImages && (
          <div className="mb-3 flex-shrink-0">
            <span className={cn('text-[9px] font-medium uppercase tracking-wider mb-1 block', style.mutedClass)}>
              Photos
            </span>
            <div className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]',
              style.id === 'cream' || style.id === 'minimal' ? 'bg-zinc-100' : 'bg-white/10'
            )}>
              📸 {note.image_files!.length} photo{note.image_files!.length > 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Branding */}
      <div className="mt-auto pt-3 border-t border-current/10 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <Music className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="font-semibold text-xs">Noteshare</span>
        </div>
      </div>
    </div>
  );
});