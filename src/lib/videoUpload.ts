import { supabase } from '@/integrations/supabase/client';

/**
 * Upload a video blob to notes-media storage.
 * Returns the storage path on success, null on failure.
 * Call this BEFORE creating the note, then pass the path into the note insert.
 */
export async function uploadVideoToStorage(
  videoBlob: Blob,
  userId: string,
): Promise<string | null> {
  const ext = videoBlob.type.includes('mp4') ? 'mp4' : 'webm';
  const fileId = crypto.randomUUID();
  const filePath = `${userId}/${fileId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('notes-media')
    .upload(filePath, videoBlob, {
      contentType: videoBlob.type || 'video/webm',
      upsert: false,
    });

  if (uploadError) {
    console.error('[uploadVideoToStorage] Upload failed:', uploadError);
    return null;
  }

  console.log(`[uploadVideoToStorage] Success: ${filePath}`);
  return filePath;
}

/**
 * @deprecated Use uploadVideoToStorage before note creation instead.
 * Legacy: Upload video and update an existing note's video_path.
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

  const { error: updateError } = await supabase
    .from('notes')
    .update({ video_path: filePath })
    .eq('id', noteId);

  if (updateError) {
    console.error('[uploadNoteVideo] Failed to update note video_path:', updateError);
    return filePath;
  }

  console.log(`[uploadNoteVideo] Success: ${filePath}`);
  return filePath;
}
