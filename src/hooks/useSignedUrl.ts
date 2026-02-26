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

function extractPathFromPublicUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
    if (match) return decodeURIComponent(match[2]);
    return null;
  } catch {
    return null;
  }
}

function isPublicStorageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.includes('/storage/v1/object/public/');
  } catch {
    return false;
  }
}

function isTokenExpired(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const token = urlObj.searchParams.get('token');
    if (!token) return false;
    const [, payloadBase64] = token.split('.');
    if (!payloadBase64) return false;
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    const exp = payload.exp;
    if (!exp) return false;
    return (exp * 1000) < (Date.now() - 5 * 60 * 1000);
  } catch {
    return true;
  }
}

function extractPathFromSignedUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/storage\/v1\/object\/sign\/([^/]+)\/(.+)/);
    if (match) return decodeURIComponent(match[2]);
    return null;
  } catch {
    return null;
  }
}

// ─── Request Coalescing ───────────────────────────────────────────────
// All signing requests within a COALESCE_WINDOW_MS window are merged
// into a single edge function invocation.

const COALESCE_WINDOW_MS = 50;

interface PendingRequest {
  url: string;
  path: string;
  resolve: (signedUrl: string) => void;
}

let pendingBatch: PendingRequest[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Classify a URL: pass-through, cached, or needs signing.
 */
function classifyUrl(url: string): { passThrough: string } | { needsSigning: string; path: string } | null {
  if (!url) return null;

  if (url.startsWith('blob:') || isExternalUrl(url)) {
    return { passThrough: url };
  }

  let urlToSign = url;
  let needsResigning = false;

  if (isPublicStorageUrl(url)) {
    const extractedPath = extractPathFromPublicUrl(url);
    if (extractedPath) {
      urlToSign = extractedPath;
      needsResigning = true;
    }
  }

  if (!needsResigning) {
    try {
      const u = new URL(url);
      if (u.searchParams.has('token')) {
        if (!isTokenExpired(url)) {
          return { passThrough: url };
        }
        const extractedPath = extractPathFromSignedUrl(url);
        if (extractedPath) {
          urlToSign = extractedPath;
          needsResigning = true;
        } else {
          return { passThrough: url };
        }
      }
    } catch {
      // not a URL
    }
  }

  if (!needsResigning && !isStorageRef(urlToSign)) {
    return { passThrough: url };
  }

  // Check in-memory cache
  const cached = signedUrlCache.get(urlToSign);
  if (cached && cached.expiresAt > Date.now()) {
    return { passThrough: cached.url };
  }

  return { needsSigning: url, path: urlToSign };
}

async function flushBatch() {
  batchTimer = null;
  const batch = pendingBatch;
  pendingBatch = [];

  if (batch.length === 0) return;

  // Deduplicate paths
  const uniquePaths = Array.from(new Set(batch.map(b => b.path)));

  // Check persistent cache first
  const persistentCached = await getCachedUrls(uniquePaths);
  
  const stillNeedSigning: string[] = [];
  for (const path of uniquePaths) {
    const cached = persistentCached.get(path);
    if (cached) {
      const expiresAt = Date.now() + 23 * 60 * 60 * 1000;
      signedUrlCache.set(path, { url: cached, expiresAt });
    } else {
      stillNeedSigning.push(path);
    }
  }

  // Sign remaining paths in a single edge function call
  if (stillNeedSigning.length > 0) {
    try {
      const { data, error } = await supabase.functions.invoke('get-signed-url', {
        body: { urls: stillNeedSigning, expiresInSeconds: 60 * 60 * 24 },
      });

      if (!error && data?.results) {
        const expiresAt = Date.now() + 23 * 60 * 60 * 1000;
        const entriesToCache: Array<{ path: string; signedUrl: string; expiresAt: number }> = [];

        for (const path of stillNeedSigning) {
          const signed = data.results[path];
          if (signed && (signed.startsWith('http') || signed.startsWith('blob:'))) {
            signedUrlCache.set(path, { url: signed, expiresAt });
            entriesToCache.push({ path, signedUrl: signed, expiresAt });
          }
        }

        if (entriesToCache.length > 0) {
          setCachedUrls(entriesToCache);
        }
      }
    } catch (err) {
      console.warn('[SignedUrl] Batch signing failed:', err);
    }
  }

  // Resolve all pending promises
  for (const req of batch) {
    const memCached = signedUrlCache.get(req.path);
    if (memCached && memCached.expiresAt > Date.now()) {
      req.resolve(memCached.url);
    } else {
      // Fall back to original URL
      req.resolve(req.url);
    }
  }
}

function enqueueForSigning(url: string, path: string): Promise<string> {
  return new Promise<string>((resolve) => {
    pendingBatch.push({ url, path, resolve });
    if (!batchTimer) {
      batchTimer = setTimeout(flushBatch, COALESCE_WINDOW_MS);
    }
  });
}

// ─── Public API ───────────────────────────────────────────────────────

/**
 * React hook for getting a signed URL. Uses the coalesced batch pipeline
 * so multiple simultaneous useSignedUrl hooks collapse into one edge call.
 */
export function useSignedUrl(originalUrl: string | null | undefined, isPublic: boolean = false) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!originalUrl) {
      setSignedUrl(null);
      return;
    }

    const classified = classifyUrl(originalUrl);
    if (!classified) {
      setSignedUrl(null);
      return;
    }

    if ('passThrough' in classified) {
      setSignedUrl(classified.passThrough);
      return;
    }

    // For public requests (logged-out users), make a direct call
    if (isPublic) {
      setLoading(true);
      supabase.functions.invoke('get-signed-url', {
        body: { url: classified.path, expiresInSeconds: 60 * 60 * 24, public: true },
      }).then(({ data, error: fnError }) => {
        if (fnError || !data?.results?.[classified.path]) {
          setSignedUrl(originalUrl);
        } else {
          const url = data.results[classified.path];
          if (url.startsWith('http')) {
            const expiresAt = Date.now() + 23 * 60 * 60 * 1000;
            signedUrlCache.set(classified.path, { url, expiresAt });
            setCachedUrl(classified.path, url, expiresAt);
            setSignedUrl(url);
          } else {
            setSignedUrl(originalUrl);
          }
        }
        setLoading(false);
      }).catch(() => {
        setSignedUrl(originalUrl);
        setLoading(false);
      });
      return;
    }

    // Use the coalesced batch pipeline
    setLoading(true);
    enqueueForSigning(originalUrl, classified.path).then((signed) => {
      setSignedUrl(signed);
      setLoading(false);
    }).catch(() => {
      setSignedUrl(originalUrl);
      setLoading(false);
    });
  }, [originalUrl, isPublic]);

  return { signedUrl, loading, error };
}

/**
 * Batch function for getting multiple signed URLs at once.
 * All calls within a 50ms window are coalesced into a single edge function call.
 */
export async function getSignedUrls(urls: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const unique = Array.from(new Set(urls.filter(Boolean)));
  const promises: Promise<void>[] = [];

  for (const url of unique) {
    const classified = classifyUrl(url);
    if (!classified) continue;

    if ('passThrough' in classified) {
      results.set(url, classified.passThrough);
      continue;
    }

    promises.push(
      enqueueForSigning(url, classified.path).then((signed) => {
        results.set(url, signed);
      })
    );
  }

  await Promise.all(promises);
  return results;
}
