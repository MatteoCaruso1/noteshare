import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  getCachedUrl, 
  getCachedUrls, 
  setCachedUrl, 
  setCachedUrls,
  clearPersistentCache 
} from '@/lib/signedUrlPersistentCache';

// In-memory cache for signed URLs (fast, but clears on reload)
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

// Export function to clear in-memory cache (call on token refresh)
export function clearSignedUrlCache() {
  signedUrlCache.clear();
}

// Export function to clear ALL caches including persistent (call on sign-out)
export function clearAllSignedUrlCaches() {
  signedUrlCache.clear();
  clearPersistentCache();
}

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

/**
 * Extract path from a public storage URL that needs signing
 * Handles URLs like: /storage/v1/object/public/bucket-name/path/to/file.jpg
 */
function extractPathFromPublicUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // Match /storage/v1/object/public/{bucket}/{path}
    const match = urlObj.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
    if (match) {
      return decodeURIComponent(match[2]);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if URL is a "public" storage URL that may need signing for private buckets
 */
function isPublicStorageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.includes('/storage/v1/object/public/');
  } catch {
    return false;
  }
}

/**
 * Check if a signed URL's JWT token has expired
 */
function isTokenExpired(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const token = urlObj.searchParams.get('token');
    if (!token) return false;
    
    // Decode JWT payload (second part) - base64url decode
    const [, payloadBase64] = token.split('.');
    if (!payloadBase64) return false;
    
    // Handle base64url encoding
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    const exp = payload.exp;
    if (!exp) return false;
    
    // Check if expired (with 5-minute buffer for safety)
    return (exp * 1000) < (Date.now() - 5 * 60 * 1000);
  } catch {
    // If we can't parse the token, assume it might be expired
    return true;
  }
}

/**
 * Extract the file path from a signed URL
 * Handles URLs like: /storage/v1/object/sign/bucket-name/path/to/file.mp3
 */
function extractPathFromSignedUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // Match /storage/v1/object/sign/{bucket}/{path}
    const match = urlObj.pathname.match(/\/storage\/v1\/object\/sign\/([^/]+)\/(.+)/);
    if (match) {
      return decodeURIComponent(match[2]);
    }
    return null;
  } catch {
    return null;
  }
}

export function useSignedUrl(originalUrl: string | null | undefined, isPublic: boolean = false) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Reset retry count when URL changes
    setRetryCount(0);
  }, [originalUrl]);

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

    // Determine the URL to sign - may need to extract path from expired signed URL or public URL
    let urlToSign = originalUrl;
    let needsResigning = false;

    // Check if it's a "public" storage URL that may need signing (private bucket with public URL format)
    if (isPublicStorageUrl(originalUrl)) {
      const extractedPath = extractPathFromPublicUrl(originalUrl);
      if (extractedPath) {
        urlToSign = extractedPath;
        needsResigning = true;
      }
    }

    // Check if it's a signed URL (has token)
    if (!needsResigning) {
      try {
        const urlObj = new URL(originalUrl);
        if (urlObj.searchParams.has('token')) {
          if (!isTokenExpired(originalUrl)) {
            // Token still valid, use as-is
            setSignedUrl(originalUrl);
            return;
          }
          // Token expired - extract path and re-sign
          const extractedPath = extractPathFromSignedUrl(originalUrl);
          if (extractedPath) {
            urlToSign = extractedPath;
            needsResigning = true;
          } else {
            // Can't extract path, try using original URL anyway
            setSignedUrl(originalUrl);
            return;
          }
        }
      } catch {
        // Not a URL; may be a direct storage path
      }
    }

    // If it doesn't look like storage and doesn't need re-signing, use as-is
    if (!needsResigning && !isStorageRef(urlToSign)) {
      setSignedUrl(originalUrl);
      return;
    }

    // Check in-memory cache first (fastest)
    const cacheKey = urlToSign;
    const memoryCached = signedUrlCache.get(cacheKey);
    if (memoryCached && memoryCached.expiresAt > Date.now()) {
      setSignedUrl(memoryCached.url);
      return;
    }

    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        // Check persistent cache (survives page reloads)
        const persistentCached = await getCachedUrl(cacheKey);
        if (persistentCached) {
          // Also populate in-memory cache
          signedUrlCache.set(cacheKey, {
            url: persistentCached,
            expiresAt: Date.now() + 23 * 60 * 60 * 1000,
          });
          setSignedUrl(persistentCached);
          setLoading(false);
          return;
        }

        const { data, error: fnError } = await supabase.functions.invoke('get-signed-url', {
          body: { url: urlToSign, expiresInSeconds: 60 * 60 * 24, ...(isPublic ? { public: true } : {}) },
        });

        if (fnError) {
          // If auth error and we haven't retried much, try again after a delay
          // This handles the case where auth state is still propagating after login
          const isAuthError = fnError.message?.toLowerCase().includes('auth') || 
                             fnError.message?.toLowerCase().includes('unauthorized') ||
                             fnError.message?.toLowerCase().includes('jwt');
          
          if (isAuthError && retryCount < 5) {
            console.log('[useSignedUrl] Auth error, retrying in 1000ms... (attempt', retryCount + 1, ')');
            setTimeout(() => setRetryCount(c => c + 1), 1000);
            return;
          }
          
          console.error('[useSignedUrl] get-signed-url error:', fnError);
          setError(new Error(fnError.message));
          // For auth errors, keep signedUrl null so components can retry when auth stabilizes
          // For non-auth errors, fall back to original URL
          if (!isAuthError) {
            setSignedUrl(originalUrl);
          }
          return;
        }

        const urlFromFn: string | undefined = data?.results?.[urlToSign];
        const finalUrl = urlFromFn || originalUrl;
        const expiresAt = Date.now() + 23 * 60 * 60 * 1000;

        // Save to both caches
        signedUrlCache.set(cacheKey, { url: finalUrl, expiresAt });
        setCachedUrl(cacheKey, finalUrl, expiresAt);

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
  }, [originalUrl, retryCount, isPublic]);

  return { signedUrl, loading, error };
}

// Batch function for getting multiple signed URLs at once
export async function getSignedUrls(urls: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  // Map from original URL to the path we'll sign
  const originalToPath = new Map<string, string>();

  const unique = Array.from(new Set(urls.filter(Boolean)));

  // Partition: pass-through vs needs signing
  const toSign: string[] = [];
  for (const url of unique) {
    if (!url) continue;

    if (url.startsWith('blob:') || isExternalUrl(url)) {
      results.set(url, url);
      continue;
    }

    // Check if it's a "public" storage URL that may need signing (private bucket with public URL format)
    let urlToSign = url;
    if (isPublicStorageUrl(url)) {
      const extractedPath = extractPathFromPublicUrl(url);
      if (extractedPath) {
        urlToSign = extractedPath;
        originalToPath.set(url, extractedPath);
      }
    }

    // Check if it's a signed URL with potentially expired token
    if (!originalToPath.has(url)) {
      try {
        const u = new URL(url);
        if (u.searchParams.has('token')) {
          if (!isTokenExpired(url)) {
            // Token still valid, use as-is
            results.set(url, url);
            continue;
          }
          // Token expired - extract path and re-sign
          const extractedPath = extractPathFromSignedUrl(url);
          if (extractedPath) {
            urlToSign = extractedPath;
            originalToPath.set(url, extractedPath);
          } else {
            // Can't extract path, try using original URL anyway
            results.set(url, url);
            continue;
          }
        }
      } catch {
        // not a URL
      }
    }

    // Check in-memory cache using the path we're going to sign
    const cacheKey = urlToSign;
    const cached = signedUrlCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      results.set(url, cached.url);
      continue;
    }

    if (!originalToPath.has(url) && !isStorageRef(urlToSign)) {
      results.set(url, url);
      continue;
    }

    toSign.push(url);
  }

  if (toSign.length === 0) return results;

  // Check persistent cache for remaining URLs
  const pathsToCheck = toSign.map(url => originalToPath.get(url) || url);
  const persistentCached = await getCachedUrls(pathsToCheck);
  
  // Filter out URLs that were found in persistent cache
  const stillNeedSigning: string[] = [];
  for (let i = 0; i < toSign.length; i++) {
    const originalUrl = toSign[i];
    const pathSigned = pathsToCheck[i];
    const cachedUrl = persistentCached.get(pathSigned);
    
    if (cachedUrl) {
      // Found in persistent cache - add to results and memory cache
      results.set(originalUrl, cachedUrl);
      signedUrlCache.set(pathSigned, {
        url: cachedUrl,
        expiresAt: Date.now() + 23 * 60 * 60 * 1000,
      });
    } else {
      stillNeedSigning.push(originalUrl);
    }
  }

  if (stillNeedSigning.length === 0) return results;

  // Build the array of paths to sign from the URLs that still need signing
  const pathsToSignNow = stillNeedSigning.map(url => originalToPath.get(url) || url);

  try {
    const { data, error: fnError } = await supabase.functions.invoke('get-signed-url', {
      body: { urls: pathsToSignNow, expiresInSeconds: 60 * 60 * 24 },
    });

    if (fnError) {
      // fall back to original
      for (const u of stillNeedSigning) results.set(u, u);
      return results;
    }

    const returned: Record<string, string> = data?.results || {};
    const entriesToCache: Array<{ path: string; signedUrl: string; expiresAt: number }> = [];
    const expiresAt = Date.now() + 23 * 60 * 60 * 1000;

    for (let i = 0; i < stillNeedSigning.length; i++) {
      const originalUrl = stillNeedSigning[i];
      const pathSigned = pathsToSignNow[i];
      const finalUrl = returned[pathSigned] || originalUrl;
      
      // Add to in-memory cache
      signedUrlCache.set(pathSigned, { url: finalUrl, expiresAt });
      
      // Collect for persistent cache batch write
      if (returned[pathSigned]) {
        entriesToCache.push({ path: pathSigned, signedUrl: finalUrl, expiresAt });
      }
      
      results.set(originalUrl, finalUrl);
    }

    // Batch write to persistent cache
    if (entriesToCache.length > 0) {
      setCachedUrls(entriesToCache);
    }
  } catch {
    for (const u of stillNeedSigning) results.set(u, u);
  }

  return results;
}

