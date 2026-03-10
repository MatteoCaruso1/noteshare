import { supabase } from '@/integrations/supabase/client';

/**
 * Upload a video blob to notes-media storage and update the note's video_path.
 * Returns the storage path on success, null on failure.
 * Failures are non-blocking — the note is already saved.
 */
export async function uploadNoteVideo(
  videoBlob: Blob,
  userId: string,
  noteId: string,
): Promise<string | null> {
  const ext = videoBlob.type.includes('mp4') ? 'mp4' : 'webm';
  const filePath = `${userId}/${noteId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('notes-media')
    .upload(filePath, videoBlob, {
      contentType: videoBlob.type || 'video/webm',
      upsert: false,
    });

  if (uploadError) {
    console.error('[uploadNoteVideo] Upload failed:', uploadError);
    return null;
  }

  // Update the note with the video path
  const { error: updateError } = await supabase
    .from('notes')
    .update({ video_path: filePath } as any)
    .eq('id', noteId);

  if (updateError) {
    console.error('[uploadNoteVideo] Failed to update note video_path:', updateError);
    // Video is uploaded but path not saved — still return path
    return filePath;
  }

  console.log(`[uploadNoteVideo] Success: ${filePath}`);
  return filePath;
}
