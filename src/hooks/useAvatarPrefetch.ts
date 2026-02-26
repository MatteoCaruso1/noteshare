import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { useFriends } from './useFriendships';
import { getSignedUrls } from './useSignedUrl';

/**
 * Extracts the storage path from a URL or returns the path as-is
 */
function extractStoragePath(url: string): string | null {
  if (!url) return null;
  if (url.startsWith('blob:')) return null;
  
  if (!url.startsWith('http')) return url;
  
  try {
    const urlObj = new URL(url);
    if (!urlObj.pathname.includes('/storage/v1/object/')) {
      return null;
    }
    const match = urlObj.pathname.match(/\/storage\/v1\/object\/(?:public\/|authenticated\/|sign\/)?([^/]+)\/(.+)/);
    if (match) {
      return decodeURIComponent(match[2]).split('?')[0];
    }
  } catch {
    // Not a valid URL
  }
  
  return null;
}

/**
 * Hook that eagerly prefetches and caches avatar URLs on app startup.
 * Uses the coalesced getSignedUrls pipeline so all avatar signing
 * merges with any other concurrent signing requests into ONE edge call.
 */
export function useAvatarPrefetch() {
  const { profile, session } = useAuth();
  const { data: friends } = useFriends();
  const hasPrefetchedRef = useRef(false);
  const userAvatarPrefetchedRef = useRef(false);

  // Prefetch current user's avatar via shared batch pipeline
  useEffect(() => {
    if (!profile?.avatar || !session?.access_token || userAvatarPrefetchedRef.current) return;
    
    const avatarPath = extractStoragePath(profile.avatar);
    if (!avatarPath) return;
    
    userAvatarPrefetchedRef.current = true;
    
    // getSignedUrls feeds into the coalesced batch - no separate edge call
    getSignedUrls([avatarPath]).then(() => {
      console.log('[AvatarPrefetch] Cached user avatar');
    }).catch((err) => {
      console.warn('[AvatarPrefetch] Failed to prefetch user avatar:', err);
    });
  }, [profile?.avatar, session?.access_token]);

  // Prefetch friends' avatars via shared batch pipeline
  useEffect(() => {
    if (!friends?.length || !session?.access_token || hasPrefetchedRef.current) return;
    
    const avatarsToFetch: string[] = [];
    
    for (const friend of friends) {
      if (!friend.avatar) continue;
      const avatarPath = extractStoragePath(friend.avatar);
      if (!avatarPath) continue;
      avatarsToFetch.push(avatarPath);
    }

    if (avatarsToFetch.length === 0) {
      hasPrefetchedRef.current = true;
      return;
    }

    hasPrefetchedRef.current = true;

    // getSignedUrls feeds into the coalesced batch - no separate edge call
    getSignedUrls(avatarsToFetch).then((results) => {
      const cached = [...results.values()].filter(v => v.startsWith('http')).length;
      if (cached > 0) {
        console.log(`[AvatarPrefetch] Cached ${cached} friend avatars`);
      }
    }).catch((err) => {
      console.warn('[AvatarPrefetch] Failed to prefetch friend avatars:', err);
    });
  }, [friends, session?.access_token]);
}
