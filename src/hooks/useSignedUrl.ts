import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Cache for signed URLs to avoid re-fetching
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

// Extract file path from a Supabase storage URL
function extractFilePath(url: string): string | null {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    
    // Handle signed URLs - they already have a token and are valid
    if (urlObj.searchParams.has('token')) {
      return null; // Already a signed URL
    }
    
    // Handle public URLs like: /storage/v1/object/public/practice-media/userId/type/file.ext
    const publicMatch = url.match(/\/storage\/v1\/object\/public\/practice-media\/(.+)/);
    if (publicMatch) {
      return publicMatch[1];
    }
    
    // Handle authenticated URLs: /storage/v1/object/authenticated/practice-media/...
    const authMatch = url.match(/\/storage\/v1\/object\/authenticated\/practice-media\/(.+)/);
    if (authMatch) {
      return authMatch[1];
    }
    
    // Handle direct path references
    if (!url.startsWith('http') && !url.startsWith('blob:')) {
      return url;
    }
    
    return null;
  } catch {
    return null;
  }
}

export function useSignedUrl(originalUrl: string | null | undefined) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!originalUrl) {
      setSignedUrl(null);
      return;
    }

    // If it's a blob URL (local recording preview), use as-is
    if (originalUrl.startsWith('blob:')) {
      setSignedUrl(originalUrl);
      return;
    }

    // Check if it's already a signed URL with token
    try {
      const urlObj = new URL(originalUrl);
      if (urlObj.searchParams.has('token')) {
        // Already signed, use directly
        setSignedUrl(originalUrl);
        return;
      }
      
      // Check if it's a PUBLIC storage URL - these don't need signing!
      if (originalUrl.includes('/storage/v1/object/public/')) {
        // Public URLs work directly without signing
        setSignedUrl(originalUrl);
        return;
      }
    } catch {
      // Not a valid URL, try to use as-is
      setSignedUrl(originalUrl);
      return;
    }

    // Check cache first
    const cached = signedUrlCache.get(originalUrl);
    if (cached && cached.expiresAt > Date.now()) {
      setSignedUrl(cached.url);
      return;
    }

    // Extract file path and get signed URL (only for non-public URLs)
    const filePath = extractFilePath(originalUrl);
    if (!filePath) {
      // Can't extract path, use original
      setSignedUrl(originalUrl);
      return;
    }

    setLoading(true);
    setError(null);

    const getSignedUrl = async () => {
      try {
        const { data, error: urlError } = await supabase.storage
          .from('practice-media')
          .createSignedUrl(filePath, 60 * 60 * 24); // 24 hour expiry

        if (urlError) {
          console.error('[useSignedUrl] Error creating signed URL:', urlError);
          setError(urlError);
          // Fall back to original URL
          setSignedUrl(originalUrl);
          return;
        }

        // Cache the signed URL (expire 1 hour before actual expiry for safety)
        signedUrlCache.set(originalUrl, {
          url: data.signedUrl,
          expiresAt: Date.now() + (23 * 60 * 60 * 1000), // 23 hours
        });

        setSignedUrl(data.signedUrl);
      } catch (err) {
        console.error('[useSignedUrl] Error:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setSignedUrl(originalUrl);
      } finally {
        setLoading(false);
      }
    };

    getSignedUrl();
  }, [originalUrl]);

  return { signedUrl, loading, error };
}

// Batch function for getting multiple signed URLs at once
export async function getSignedUrls(urls: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  
  const promises = urls.map(async (url) => {
    if (!url) return;
    
    // Blob URLs pass through
    if (url.startsWith('blob:')) {
      results.set(url, url);
      return;
    }
    
    // Check if already signed or is a public URL
    try {
      const urlObj = new URL(url);
      if (urlObj.searchParams.has('token')) {
        results.set(url, url);
        return;
      }
      // Public URLs don't need signing
      if (url.includes('/storage/v1/object/public/')) {
        results.set(url, url);
        return;
      }
    } catch {
      results.set(url, url);
      return;
    }
    
    // Check cache
    const cached = signedUrlCache.get(url);
    if (cached && cached.expiresAt > Date.now()) {
      results.set(url, cached.url);
      return;
    }
    
    // Get signed URL
    const filePath = extractFilePath(url);
    if (!filePath) {
      results.set(url, url);
      return;
    }
    
    try {
      const { data, error } = await supabase.storage
        .from('practice-media')
        .createSignedUrl(filePath, 60 * 60 * 24);
        
      if (error || !data) {
        results.set(url, url);
        return;
      }
      
      signedUrlCache.set(url, {
        url: data.signedUrl,
        expiresAt: Date.now() + (23 * 60 * 60 * 1000),
      });
      
      results.set(url, data.signedUrl);
    } catch {
      results.set(url, url);
    }
  });
  
  await Promise.all(promises);
  return results;
}
