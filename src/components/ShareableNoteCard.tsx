import { memo, useMemo } from 'react';
import { NoteWithAuthor, Profile } from '@/types';
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

export interface JammerInfo {
  id: string;
  name: string;
  avatar: string | null;
}

interface ShareableNoteCardProps {
  note: NoteWithAuthor;
  styleId: CardStyleId;
  audioToInclude: number[]; // indices of audio files to include
  instruments?: string[]; // list of instruments
  jammers?: JammerInfo[]; // list of jammers with profile pics
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
  instruments = [],
  jammers = [],
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
  const hasInstruments = instruments.length > 0;
  const hasJammers = jammers.length > 0;

  // Dynamically calculate max text length based on what else is displayed
  const truncatedNotes = useMemo(() => {
    if (!plainTextContent) return '';
    
    // Lower base limit to fit more sections
    let maxLength = 150;
    
    // Reduce limit if we have other sections to display
    if (hasAudio) maxLength -= 25;
    if (hasImages) maxLength -= 20;
    if (hasInstruments) maxLength -= 20;
    if (hasJammers) maxLength -= 25;
    
    // Ensure minimum
    maxLength = Math.max(maxLength, 60);
    
    if (plainTextContent.length > maxLength) {
      const trimmed = plainTextContent.slice(0, maxLength);
      const lastSpace = trimmed.lastIndexOf(' ');
      const cutPoint = lastSpace > maxLength * 0.7 ? lastSpace : maxLength;
      return plainTextContent.slice(0, cutPoint).trim() + '...';
    }
    return plainTextContent;
  }, [plainTextContent, hasAudio, hasImages, hasInstruments, hasJammers]);

  return (
    <div
      className={cn(
        'relative rounded-2xl overflow-hidden flex flex-col',
        style.bgClass,
        style.textClass,
        className
      )}
      style={{
        // Use explicit dimensions for consistent html2canvas rendering
        width: '100%',
        aspectRatio: '9 / 16',
        padding: '16px',
      }}
    >
      {/* Top Section - Type & Date */}
      <div style={{ marginBottom: '12px' }}>
        <div className="flex items-center gap-1.5 text-xs font-medium text-primary" style={{ marginBottom: '2px' }}>
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
          <div style={{ marginBottom: '10px' }} className="flex-shrink-0">
            <span className={cn('font-medium uppercase tracking-wider block', style.mutedClass)} style={{ fontSize: '9px', marginBottom: '4px' }}>
              Duration
            </span>
            <div
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full font-bold',
                style.id === 'cream' || style.id === 'minimal' ? 'bg-zinc-100' : 'bg-white/10'
              )}
              style={{
                padding: '4px 10px',
                fontSize: '13px',
                lineHeight: '1',
              }}
            >
              <Clock style={{ width: '12px', height: '12px', flexShrink: 0 }} />
              <span style={{ lineHeight: '1' }}>{sessionDuration}</span>
            </div>
          </div>
        )}

        {/* Instruments Section */}
        {hasInstruments && (
          <div style={{ marginBottom: '10px' }} className="flex-shrink-0">
            <span className={cn('font-medium uppercase tracking-wider block', style.mutedClass)} style={{ fontSize: '9px', marginBottom: '4px' }}>
              Instruments
            </span>
            <div className="flex flex-wrap gap-1">
              {instruments.slice(0, 3).map((instrument, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'inline-flex items-center rounded-full',
                    style.id === 'cream' || style.id === 'minimal' ? 'bg-zinc-100' : 'bg-white/10'
                  )}
                  style={{ padding: '3px 8px', fontSize: '10px' }}
                >
                  <span>{instrument}</span>
                </div>
              ))}
              {instruments.length > 3 && (
                <span className={cn('text-xs', style.mutedClass)} style={{ fontSize: '10px', padding: '3px 4px' }}>
                  +{instruments.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Jammers Section */}
        {hasJammers && (
          <div style={{ marginBottom: '10px' }} className="flex-shrink-0">
            <span className={cn('font-medium uppercase tracking-wider block', style.mutedClass)} style={{ fontSize: '9px', marginBottom: '4px' }}>
              Jamming With
            </span>
            <div className="flex items-center gap-1.5">
              {/* Stacked avatars */}
              <div className="flex" style={{ marginLeft: '4px' }}>
                {jammers.slice(0, 4).map((jammer, idx) => (
                  <div
                    key={jammer.id}
                    className="rounded-full border-2 overflow-hidden flex items-center justify-center"
                    style={{
                      width: '24px',
                      height: '24px',
                      marginLeft: idx === 0 ? 0 : '-8px',
                      borderColor: style.id === 'cream' || style.id === 'minimal' ? '#fff' : 'rgba(0,0,0,0.3)',
                      zIndex: 10 - idx,
                      position: 'relative',
                      backgroundColor: style.id === 'cream' || style.id === 'minimal' ? '#e5e5e5' : 'rgba(255,255,255,0.2)',
                    }}
                  >
                    {jammer.avatar ? (
                      <img
                        src={jammer.avatar}
                        alt={jammer.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          // Hide broken image, show fallback background
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : null}
                    <span 
                      style={{ 
                        fontSize: '10px', 
                        fontWeight: 600,
                        position: 'absolute',
                        display: jammer.avatar ? 'none' : 'block',
                      }}
                    >
                      {jammer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
              {/* All names */}
              <span style={{ fontSize: '10px', marginLeft: '4px' }}>
                {jammers.map(j => j.name).join(', ')}
              </span>
            </div>
          </div>
        )}

        {/* Text Content Section - smaller font, tighter spacing */}
        {truncatedNotes && (
          <div style={{ marginBottom: '10px' }} className="flex-shrink-0">
            <span className={cn('font-medium uppercase tracking-wider block', style.mutedClass)} style={{ fontSize: '9px', marginBottom: '4px' }}>
              {isPracticeSession ? 'Session Notes' : 'Notes'}
            </span>
            <p style={{ fontSize: '11px', lineHeight: '1.4' }}>
              {truncatedNotes}
            </p>
          </div>
        )}

        {/* Audio File Section - single recording only */}
        {audioFile && (
          <div style={{ marginBottom: '10px' }} className="flex-shrink-0">
            <span className={cn('font-medium uppercase tracking-wider block', style.mutedClass)} style={{ fontSize: '9px', marginBottom: '4px' }}>
              Recording
            </span>
            <div
              className={cn(
                'flex items-center gap-2 rounded-xl',
                style.id === 'cream' || style.id === 'minimal' ? 'bg-zinc-100' : 'bg-white/10'
              )}
              style={{ padding: '6px 10px' }}
            >
              <div
                className={cn(
                  'rounded-full flex items-center justify-center flex-shrink-0',
                  style.id === 'cream' || style.id === 'minimal' ? 'bg-primary/10' : 'bg-white/20'
                )}
                style={{ width: '22px', height: '22px' }}
              >
                <Mic style={{ width: '11px', height: '11px' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate" style={{ fontSize: '10px' }}>{audioFile.name}</p>
                <p className={style.mutedClass} style={{ fontSize: '8px' }}>Audio Recording</p>
              </div>
            </div>
          </div>
        )}

        {/* Image indicator */}
        {hasImages && (
          <div style={{ marginBottom: '10px' }} className="flex-shrink-0">
            <span className={cn('font-medium uppercase tracking-wider block', style.mutedClass)} style={{ fontSize: '9px', marginBottom: '4px' }}>
              Photos
            </span>
            <div
              className={cn(
                'inline-flex items-center gap-1 rounded-full',
                style.id === 'cream' || style.id === 'minimal' ? 'bg-zinc-100' : 'bg-white/10'
              )}
              style={{ padding: '3px 8px', fontSize: '10px' }}
            >
              📸 {note.image_files!.length} photo{note.image_files!.length > 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Branding */}
      <div className="mt-auto flex-shrink-0" style={{ paddingTop: '10px', borderTop: '1px solid currentColor', borderTopColor: 'rgba(128,128,128,0.2)' }}>
        <div className="flex items-center gap-1.5">
          <div className="rounded-full bg-primary flex items-center justify-center" style={{ width: '18px', height: '18px' }}>
            <Music className="text-primary-foreground" style={{ width: '10px', height: '10px' }} />
          </div>
          <span className="font-semibold" style={{ fontSize: '11px' }}>Noteshare</span>
        </div>
      </div>
    </div>
  );
});
