import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Cache for signed URLs to avoid re-fetching
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

type ParsedStorageRef = {
  bucket: string;
  path: string;
};

function parseStorageRef(url: string): ParsedStorageRef | null {
  if (!url) return null;

  // Direct path references (we assume practice-media for legacy stored paths)
  if (!url.startsWith('http') && !url.startsWith('blob:')) {
    return { bucket: 'practice-media', path: url };
  }

  try {
    const urlObj = new URL(url);

    // Signed URLs are already usable as-is.
    if (urlObj.searchParams.has('token')) {
      return null;
    }

    // Match both public and authenticated object URLs.
    // /storage/v1/object/public/{bucket}/{path}
    // /storage/v1/object/authenticated/{bucket}/{path}
    const match = urlObj.pathname.match(/\/storage\/v1\/object\/(?:public|authenticated)\/([^/]+)\/(.+)/);
    if (!match) return null;

    const bucket = match[1];
    const path = decodeURIComponent(match[2]);
    return { bucket, path };
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

    // Local blob previews pass through.
    if (originalUrl.startsWith('blob:')) {
      setSignedUrl(originalUrl);
      return;
    }

    // Already signed URL passes through.
    try {
      const urlObj = new URL(originalUrl);
      if (urlObj.searchParams.has('token')) {
        setSignedUrl(originalUrl);
        return;
      }
    } catch {
      // Not a URL; may be a direct storage path. We'll still try to sign it below.
    }

    // Cache
    const cached = signedUrlCache.get(originalUrl);
    if (cached && cached.expiresAt > Date.now()) {
      setSignedUrl(cached.url);
      return;
    }

    const ref = parseStorageRef(originalUrl);
    if (!ref) {
      // Not a storage URL we recognize; use as-is.
      setSignedUrl(originalUrl);
      return;
    }

    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const { data, error: urlError } = await supabase.storage
          .from(ref.bucket)
          .createSignedUrl(ref.path, 60 * 60 * 24); // 24 hours

        if (urlError || !data?.signedUrl) {
          console.error('[useSignedUrl] Error creating signed URL:', urlError);
          setError(urlError ?? new Error('Failed to create signed URL'));
          setSignedUrl(originalUrl);
          return;
        }

        signedUrlCache.set(originalUrl, {
          url: data.signedUrl,
          expiresAt: Date.now() + 23 * 60 * 60 * 1000, // 23 hours
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

    run();
  }, [originalUrl]);

  return { signedUrl, loading, error };
}

// Batch function for getting multiple signed URLs at once
export async function getSignedUrls(urls: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  await Promise.all(
    urls.map(async (url) => {
      if (!url) return;

      // Blob URLs pass through
      if (url.startsWith('blob:')) {
        results.set(url, url);
        return;
      }

      // Already signed URL passes through
      try {
        const urlObj = new URL(url);
        if (urlObj.searchParams.has('token')) {
          results.set(url, url);
          return;
        }
      } catch {
        // Continue; might be a direct path
      }

      // Cache
      const cached = signedUrlCache.get(url);
      if (cached && cached.expiresAt > Date.now()) {
        results.set(url, cached.url);
        return;
      }

      const ref = parseStorageRef(url);
      if (!ref) {
        results.set(url, url);
        return;
      }

      try {
        const { data, error } = await supabase.storage
          .from(ref.bucket)
          .createSignedUrl(ref.path, 60 * 60 * 24);

        if (error || !data?.signedUrl) {
          results.set(url, url);
          return;
        }

        signedUrlCache.set(url, {
          url: data.signedUrl,
          expiresAt: Date.now() + 23 * 60 * 60 * 1000,
        });

        results.set(url, data.signedUrl);
      } catch {
        results.set(url, url);
      }
    })
  );

  return results;
}
