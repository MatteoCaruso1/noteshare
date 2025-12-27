import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Helper to get a signed URL for private bucket access
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
  
  const { data, error } = await supabase.storage
    .from('practice-media')
    .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 day expiry
    
  if (error) {
    console.error('[MediaUpload] Error creating signed URL:', error);
    return null;
  }
  
  return data.signedUrl;
}

export function useMediaUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (
    file: File,
    userId: string,
    type: 'audio' | 'image' | 'video'
  ): Promise<string | null> => {
    try {
      setUploading(true);
      setProgress(0);

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${type}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('practice-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Use signed URL for private bucket
      const signedUrl = await getSignedUrl(data.path);
      
      setProgress(100);
      return signedUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const uploadAudio = async (blob: Blob, userId: string): Promise<string | null> => {
    // Preserve the original MIME type from the recorder and align file extension
    const mimeType = blob.type || 'audio/webm';
    let ext = 'webm';

    if (mimeType.includes('mp4')) {
      ext = 'mp4';
    } else if (mimeType.includes('ogg')) {
      ext = 'ogg';
    } else if (mimeType.includes('wav')) {
      ext = 'wav';
    }

    const file = new File([blob], `recording-${Date.now()}.${ext}`, { type: mimeType });
    console.log('[MediaUpload] uploading audio file', file.name, 'size:', file.size, 'type:', file.type);
    return uploadFile(file, userId, 'audio');
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
    uploadImage,
    uploadVideo,
    getSignedUrl,
  };
}
