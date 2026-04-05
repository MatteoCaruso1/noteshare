/**
 * Sync processor: drains the offline queue when connectivity is restored.
 *
 * Processes entries in FIFO order. If a session was created offline with a
 * local ID, subsequent notes that reference that session get their IDs remapped
 * to the real server-side ID.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  getQueue,
  removeEntry,
  updateEntry,
  OfflineQueueEntry,
} from './offlineQueue';

/** Maps optimistic local IDs → real server IDs within a single sync run. */
const idMap = new Map<string, string>();

const MAX_RETRIES = 5;

function backoffMs(retries: number): number {
  return Math.min(1000 * 2 ** retries, 30_000);
}

/** Resolve a value through the id map (for session IDs created offline). */
function resolve(id: string | undefined | null): string | undefined | null {
  if (!id) return id;
  return idMap.get(id) ?? id;
}

async function processEntry(entry: OfflineQueueEntry): Promise<boolean> {
  try {
    switch (entry.type) {
      case 'start_session': {
        const p = entry.payload;
        // End existing active sessions first
        await supabase
          .from('practice_sessions')
          .update({ is_active: false, ended_at: new Date().toISOString() })
          .eq('user_id', p.userId)
          .eq('is_active', true);

        const { data, error } = await supabase
          .from('practice_sessions')
          .insert({
            user_id: p.userId,
            goals: p.goals || null,
            is_active: true,
            started_at: p.startedAt,
            is_mobile: p.isMobile ?? false,
          } as any)
          .select()
          .single();

        if (error) throw error;

        // Map optimistic ID → real ID for subsequent notes
        if (p.optimisticId) {
          idMap.set(p.optimisticId, data.id);
        }
        return true;
      }

      case 'end_session': {
        const p = entry.payload;
        const sessionId = resolve(p.sessionId) as string;

        // Fetch current session for pause calculations
        const { data: current, error: fetchErr } = await supabase
          .from('practice_sessions')
          .select('started_at, paused_at, paused_duration_ms')
          .eq('id', sessionId)
          .single();

        if (fetchErr) throw fetchErr;

        let finalPausedMs = current?.paused_duration_ms || 0;
        if (current?.paused_at) {
          finalPausedMs += new Date(p.endedAt).getTime() - new Date(current.paused_at).getTime();
        }

        const { error } = await supabase
          .from('practice_sessions')
          .update({
            is_active: false,
            ended_at: p.endedAt,
            notes_summary: p.notesSummary || null,
            paused_at: null,
            paused_duration_ms: finalPausedMs,
            collaborator_ids: p.collaboratorIds || [],
          })
          .eq('id', sessionId);

        if (error) throw error;
        return true;
      }

      case 'pause_session': {
        const p = entry.payload;
        const sessionId = resolve(p.sessionId) as string;
        const { error } = await supabase
          .from('practice_sessions')
          .update({ paused_at: p.pausedAt })
          .eq('id', sessionId);
        if (error) throw error;
        return true;
      }

      case 'resume_session': {
        const p = entry.payload;
        const sessionId = resolve(p.sessionId) as string;
        const { data: session, error: fetchErr } = await supabase
          .from('practice_sessions')
          .select('paused_at, paused_duration_ms')
          .eq('id', sessionId)
          .single();
        if (fetchErr) throw fetchErr;

        const pausedAt = session?.paused_at ? new Date(session.paused_at) : null;
        const additionalMs = pausedAt ? new Date(p.resumedAt).getTime() - pausedAt.getTime() : 0;

        const { error } = await supabase
          .from('practice_sessions')
          .update({
            paused_at: null,
            paused_duration_ms: (session?.paused_duration_ms || 0) + additionalMs,
          })
          .eq('id', sessionId);
        if (error) throw error;
        return true;
      }

      case 'create_note': {
        const p = entry.payload;
        const sessionId = resolve(p.sessionId) as string | undefined;

        const { error } = await supabase
          .from('notes')
          .insert({
            author_id: p.authorId,
            text_content: p.textContent || null,
            audio_files: p.audioFiles || [],
            audio_file_names: p.audioFileNames || [],
            image_files: p.imageFiles || [],
            video_files: p.videoFiles || [],
            tags: p.tags || [],
            session_id: sessionId || null,
            project_id: p.projectId || null,
            goal_id: p.goalId || null,
            gig_id: p.gigId || null,
            visibility: p.visibility || 'friends',
            focus_entry_id: p.focusEntryId || null,
            focus_date: p.focusDate || null,
            focus_text_snapshot: p.focusTextSnapshot || null,
            focus_title_snapshot: p.focusTitleSnapshot || null,
            private_audio_indices: p.privateAudioIndices || [],
            video_path: p.videoPath || null,
            video_name: p.videoName || null,
            video_thumbnail_path: p.videoThumbnailPath || null,
          });

        if (error) throw error;
        return true;
      }

      case 'log_offline_session': {
        const p = entry.payload;
        const [year, month, day] = p.date.split('-').map(Number);
        const startedAt = new Date(year, month - 1, day, 12, 0, 0);
        const endedAt = new Date(startedAt.getTime() + p.durationMinutes * 60 * 1000);

        const { data: session, error: sErr } = await supabase
          .from('practice_sessions')
          .insert({
            user_id: p.userId,
            started_at: startedAt.toISOString(),
            ended_at: endedAt.toISOString(),
            is_active: false,
            is_mobile: false,
          } as any)
          .select()
          .single();
        if (sErr) throw sErr;

        if (p.noteText) {
          const { error: nErr } = await supabase
            .from('notes')
            .insert({
              author_id: p.userId,
              text_content: p.noteText,
              session_id: session.id,
              tags: p.tags || [],
              visibility: 'friends',
            });
          if (nErr) throw nErr;
        }
        return true;
      }

      default:
        console.warn('[offlineSync] Unknown entry type:', entry.type);
        return true; // Remove unknown entries
    }
  } catch (err) {
    console.error(`[offlineSync] Failed to process ${entry.type}:`, err);
    return false;
  }
}

export type SyncProgress = {
  total: number;
  completed: number;
  failed: number;
  isSyncing: boolean;
};

type ProgressCallback = (progress: SyncProgress) => void;

let isSyncing = false;

export async function processOfflineQueue(onProgress?: ProgressCallback): Promise<SyncProgress> {
  if (isSyncing) return { total: 0, completed: 0, failed: 0, isSyncing: true };
  isSyncing = true;

  const queue = await getQueue();
  const progress: SyncProgress = { total: queue.length, completed: 0, failed: 0, isSyncing: true };

  if (queue.length === 0) {
    isSyncing = false;
    return { ...progress, isSyncing: false };
  }

  onProgress?.(progress);

  for (const entry of queue) {
    if (!navigator.onLine) {
      // Lost connection again — stop processing
      break;
    }

    if (entry.retries >= MAX_RETRIES) {
      console.warn(`[offlineSync] Giving up on entry ${entry.id} after ${MAX_RETRIES} retries`);
      await removeEntry(entry.id);
      progress.failed++;
      onProgress?.(progress);
      continue;
    }

    const success = await processEntry(entry);

    if (success) {
      await removeEntry(entry.id);
      progress.completed++;
    } else {
      entry.retries++;
      await updateEntry(entry);
      progress.failed++;

      // Wait with backoff before next attempt
      await new Promise(r => setTimeout(r, backoffMs(entry.retries)));
    }

    onProgress?.(progress);
  }

  idMap.clear();
  isSyncing = false;
  progress.isSyncing = false;
  onProgress?.(progress);

  return progress;
}
