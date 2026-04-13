import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

// Helper to get a signed URL for private bucket access
// Routes through the batched pipeline (no direct storage signing)
export async function getSignedUrl(path: string): Promise<string | null> {
  // Extract the file path from a full URL if needed
  let filePath = path;
  if (path.includes('/storage/v1/object/')) {
    // Extract path after 'practice-media/'
    const match = path.match(/practice-media\/(.+)/);
    if (match) {
      filePath = match[1];
    }
  }
  
  const { getSignedUrls } = await import('./useSignedUrl');
  const results = await getSignedUrls([filePath]);
  return results.get(filePath) || null;
}

/**
 * Sleep helper for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Upload a file with XMLHttpRequest to get progress updates
 * Falls back to Supabase SDK if XHR fails
 */
async function uploadWithProgress(
  file: File,
  filePath: string,
  onProgress?: (progress: number) => void
): Promise<{ path: string } | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  
  if (!accessToken) {
    console.warn('[MediaUpload] No access token, falling back to SDK upload');
    return uploadWithSDK(file, filePath);
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const uploadUrl = `${supabaseUrl}/storage/v1/object/practice-media/${filePath}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = (event.loaded / event.total) * 100;
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        console.log('[MediaUpload] XHR upload success:', filePath);
        resolve({ path: filePath });
      } else {
        console.error('[MediaUpload] XHR upload failed:', xhr.status, xhr.statusText);
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      console.error('[MediaUpload] XHR network error');
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      console.error('[MediaUpload] XHR upload aborted');
      reject(new Error('Upload was aborted'));
    });

    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('x-upsert', 'false');
    
    // Let the browser set Content-Type with boundary for the file
    xhr.send(file);
  });
}

/**
 * Standard SDK upload (fallback)
 */
async function uploadWithSDK(
  file: File,
  filePath: string
): Promise<{ path: string } | null> {
  const { data, error } = await supabase.storage
    .from('practice-media')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;
  return data;
}

export function useMediaUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  /**
   * Core upload function with retry logic and progress tracking
   */
  const uploadFileWithRetry = useCallback(async (
    file: File,
    userId: string,
    type: 'audio' | 'image' | 'video',
    onProgress?: (progress: number) => void
  ): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${type}/${Date.now()}.${fileExt}`;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[MediaUpload] Upload attempt ${attempt}/${MAX_RETRIES} for ${fileName}`);
        
        const data = await uploadWithProgress(file, fileName, (p) => {
          setProgress(p);
          onProgress?.(p);
        });

        if (data?.path) {
          console.log(`[MediaUpload] Upload successful on attempt ${attempt}`);
          return data.path;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[MediaUpload] Attempt ${attempt} failed:`, lastError.message);
        
        if (attempt < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          console.log(`[MediaUpload] Retrying in ${delay}ms...`);
          await sleep(delay);
        }
      }
    }

    // All retries exhausted
    console.error('[MediaUpload] All upload attempts failed:', lastError);
    throw lastError || new Error('Upload failed after all retries');
  }, []);

  const uploadFile = async (
    file: File,
    userId: string,
    type: 'audio' | 'image' | 'video'
  ): Promise<string | null> => {
    try {
      setUploading(true);
      setProgress(0);

      const path = await uploadFileWithRetry(file, userId, type);
      
      setProgress(100);
      return path;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file. Please try again.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const uploadAudio = async (blob: Blob, userId: string): Promise<string | null> => {
    const { ext, mimeType } = getAudioFileInfo(blob);
    const file = new File([blob], `recording-${Date.now()}.${ext}`, { type: mimeType });
    console.log('[MediaUpload] uploading audio file', file.name, 'size:', file.size, 'type:', file.type);
    return uploadFile(file, userId, 'audio');
  };

  /**
   * Upload audio with progress callback - used for recovery
   */
  const uploadAudioWithProgress = async (
    blob: Blob, 
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<string | null> => {
    const { ext, mimeType } = getAudioFileInfo(blob);
    const file = new File([blob], `recording-${Date.now()}.${ext}`, { type: mimeType });
    
    try {
      setUploading(true);
      setProgress(0);

      const path = await uploadFileWithRetry(file, userId, 'audio', onProgress);
      
      setProgress(100);
      onProgress?.(100);
      return path;
    } catch (error) {
      console.error('Audio upload with progress error:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const uploadImage = async (file: File, userId: string): Promise<string | null> => {
    let toUpload = file;

    try {
      const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (file.type.startsWith('image/') && !supportedTypes.includes(file.type)) {
        console.log('[MediaUpload] Converting image to JPEG for compatibility, original type:', file.type);

        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(bitmap, 0, 0);
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
          );

          if (blob) {
            toUpload = new File([blob], `image-${Date.now()}.jpeg`, { type: 'image/jpeg' });
          }
        }
      }
    } catch (error) {
      console.warn('[MediaUpload] Image compatibility conversion failed, uploading original file', error);
    }

    return uploadFile(toUpload, userId, 'image');
  };
 
  const uploadVideo = async (file: File, userId: string): Promise<string | null> => {
    return uploadFile(file, userId, 'video');
  };

  return {
    uploading,
    progress,
    uploadFile,
    uploadAudio,
    uploadAudioWithProgress,
    uploadImage,
    uploadVideo,
    getSignedUrl,
  };
}
