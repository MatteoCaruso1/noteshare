import { useEffect } from 'react';
import { NoteWithAuthor } from '@/types';
import { getSignedUrls } from './useSignedUrl';

/**
 * Prefetch signed URLs for all media in a list of notes.
 * This batches all URL signing into a single edge function call.
 */
export function useSignedUrlPrefetch(notes: NoteWithAuthor[] | undefined) {
  useEffect(() => {
    if (!notes?.length) return;

    // Collect all unique URLs that need signing
    const urlsToSign: string[] = [];

    for (const note of notes) {
      // Avatar URLs
      if (note.author?.avatar) {
        urlsToSign.push(note.author.avatar);
      }

      // Audio files
      if (note.audio_files?.length) {
        urlsToSign.push(...note.audio_files);
      }

      // Image files
      if (note.image_files?.length) {
        urlsToSign.push(...note.image_files);
      }

      // Video files
      if (note.video_files?.length) {
        urlsToSign.push(...note.video_files);
      }
    }

    // Dedupe and prefetch
    const uniqueUrls = Array.from(new Set(urlsToSign.filter(Boolean)));
    
    if (uniqueUrls.length > 0) {
      // This populates the cache, so subsequent useSignedUrl calls are instant
      getSignedUrls(uniqueUrls);
    }
  }, [notes]);
}
