import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Cache for signed URLs to avoid re-fetching
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

type ParsedStorageRef = {
  bucket: string;
  path: string;
};

/**
 * Parse a Supabase storage URL or path into bucket + path.
 * Handles:
 *  - Full URLs: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
 *  - Full URLs: https://<project>.supabase.co/storage/v1/object/authenticated/<bucket>/<path>
 *  - Already signed URLs (returns null - no need to sign again)
 *  - Direct path references (legacy - assumes practice-media bucket)
 */
function parseStorageRef(url: string): ParsedStorageRef | null {
  if (!url) return null;

  // Direct path references (legacy stored paths without full URL)
  if (!url.startsWith('http') && !url.startsWith('blob:')) {
    return { bucket: 'practice-media', path: url };
  }

  try {
    const urlObj = new URL(url);

    // Already signed URLs have a token - no need to sign again
    if (urlObj.searchParams.has('token')) {
      return null;
    }

    // Match Supabase storage URLs:
    // /storage/v1/object/public/{bucket}/{path}
    // /storage/v1/object/authenticated/{bucket}/{path}
    // /storage/v1/object/{bucket}/{path} (older format)
    const match = urlObj.pathname.match(/\/storage\/v1\/object\/(?:public\/|authenticated\/)?([^/]+)\/(.+)/);
    if (match) {
      const bucket = match[1];
      const path = decodeURIComponent(match[2]);
      return { bucket, path };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a URL is an external (non-Supabase storage) URL that should pass through
 */
function isExternalUrl(url: string): boolean {
  if (!url.startsWith('http')) return false;
  
  try {
    const urlObj = new URL(url);
    // If it's not a Supabase storage URL, it's external (e.g., dicebear avatars)
    return !urlObj.pathname.includes('/storage/v1/object/');
  } catch {
    return false;
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

    // Local blob previews pass through
    if (originalUrl.startsWith('blob:')) {
      setSignedUrl(originalUrl);
      return;
    }

    // External URLs (not Supabase storage) pass through directly
    if (isExternalUrl(originalUrl)) {
      setSignedUrl(originalUrl);
      return;
    }

    // Already signed URL passes through
    try {
      const urlObj = new URL(originalUrl);
      if (urlObj.searchParams.has('token')) {
        setSignedUrl(originalUrl);
        return;
      }
    } catch {
      // Not a URL; may be a direct storage path. Continue to try signing.
    }

    // Check cache
    const cached = signedUrlCache.get(originalUrl);
    if (cached && cached.expiresAt > Date.now()) {
      setSignedUrl(cached.url);
      return;
    }

    const ref = parseStorageRef(originalUrl);
    if (!ref) {
      // Not a storage URL we recognize; use as-is
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
          console.error('[useSignedUrl] Error creating signed URL for path:', ref.path, urlError);
          setError(urlError ?? new Error('Failed to create signed URL'));
          // Fall back to original - might work if bucket becomes public again
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

      // External URLs pass through
      if (isExternalUrl(url)) {
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
