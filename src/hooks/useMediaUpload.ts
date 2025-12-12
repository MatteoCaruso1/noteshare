import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

      const { data: urlData } = supabase.storage
        .from('practice-media')
        .getPublicUrl(data.path);

      setProgress(100);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const uploadAudio = async (blob: Blob, userId: string): Promise<string | null> => {
    const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
    return uploadFile(file, userId, 'audio');
  };

  const uploadImage = async (file: File, userId: string): Promise<string | null> => {
    return uploadFile(file, userId, 'image');
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
  };
}
