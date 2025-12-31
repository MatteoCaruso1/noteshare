import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Cache for signed URLs to avoid re-fetching
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Check if a URL is an external (non-storage) URL that should pass through
 */
function isExternalUrl(url: string): boolean {
  if (!url.startsWith('http')) return false;

  try {
    const urlObj = new URL(url);
    return !urlObj.pathname.includes('/storage/v1/object/');
  } catch {
    return false;
  }
}

/**
 * True if the string looks like a storage URL/path (i.e. could need signing)
 */
function isStorageRef(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('blob:')) return false;
  if (!url.startsWith('http')) return true; // legacy stored paths
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.includes('/storage/v1/object/');
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

    // External URLs (not storage) pass through directly
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
      // Not a URL; may be a direct storage path.
    }

    // If it doesn't look like storage, use as-is
    if (!isStorageRef(originalUrl)) {
      setSignedUrl(originalUrl);
      return;
    }

    // Check cache
    const cached = signedUrlCache.get(originalUrl);
    if (cached && cached.expiresAt > Date.now()) {
      setSignedUrl(cached.url);
      return;
    }

    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('get-signed-url', {
          body: { url: originalUrl, expiresInSeconds: 60 * 60 * 24 },
        });

        if (fnError) {
          console.error('[useSignedUrl] get-signed-url error:', fnError);
          setError(new Error(fnError.message));
          setSignedUrl(originalUrl);
          return;
        }

        const urlFromFn: string | undefined = data?.results?.[originalUrl];
        const finalUrl = urlFromFn || originalUrl;

        signedUrlCache.set(originalUrl, {
          url: finalUrl,
          expiresAt: Date.now() + 23 * 60 * 60 * 1000,
        });

        setSignedUrl(finalUrl);
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

  const unique = Array.from(new Set(urls.filter(Boolean)));

  // Partition: pass-through vs needs signing
  const toSign: string[] = [];
  for (const url of unique) {
    if (!url) continue;

    if (url.startsWith('blob:') || isExternalUrl(url)) {
      results.set(url, url);
      continue;
    }

    try {
      const u = new URL(url);
      if (u.searchParams.has('token')) {
        results.set(url, url);
        continue;
      }
    } catch {
      // not a URL
    }

    const cached = signedUrlCache.get(url);
    if (cached && cached.expiresAt > Date.now()) {
      results.set(url, cached.url);
      continue;
    }

    if (!isStorageRef(url)) {
      results.set(url, url);
      continue;
    }

    toSign.push(url);
  }

  if (toSign.length === 0) return results;

  try {
    const { data, error: fnError } = await supabase.functions.invoke('get-signed-url', {
      body: { urls: toSign, expiresInSeconds: 60 * 60 * 24 },
    });

    if (fnError) {
      // fall back to original
      for (const u of toSign) results.set(u, u);
      return results;
    }

    const returned: Record<string, string> = data?.results || {};
    for (const original of toSign) {
      const finalUrl = returned[original] || original;
      signedUrlCache.set(original, {
        url: finalUrl,
        expiresAt: Date.now() + 23 * 60 * 60 * 1000,
      });
      results.set(original, finalUrl);
    }
  } catch {
    for (const u of toSign) results.set(u, u);
  }

  return results;
}

