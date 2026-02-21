import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { useFriends } from './useFriendships';
import { supabase } from '@/integrations/supabase/client';
import { setCachedUrls, getCachedUrl } from '@/lib/signedUrlPersistentCache';

/**
 * Extracts the storage path from a URL or returns the path as-is
 */
function extractStoragePath(url: string): string | null {
  if (!url) return null;
  if (url.startsWith('blob:')) return null;
  
  // If it's not a URL, assume it's a direct path
  if (!url.startsWith('http')) return url;
  
  // External URLs (like dicebear) don't need signing
  try {
    const urlObj = new URL(url);
    if (!urlObj.pathname.includes('/storage/v1/object/')) {
      return null; // External URL, no caching needed
    }
    
    // Extract path from storage URL
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
 * Hook that eagerly prefetches and caches avatar URLs on app startup
 * Caches: current user's avatar + all friends' avatars
 * 
 * This runs at App level to ensure avatars are cached BEFORE components render
 */
export function useAvatarPrefetch() {
  const { profile, session } = useAuth();
  const { data: friends } = useFriends();
  const hasPrefetchedRef = useRef(false);
  const prefetchedAvatarsRef = useRef(new Set<string>());
  const userAvatarPrefetchedRef = useRef(false);

  // Prefetch current user's avatar IMMEDIATELY when auth is ready
  useEffect(() => {
    if (!profile?.avatar || !session?.access_token || userAvatarPrefetchedRef.current) return;
    
    const avatarPath = extractStoragePath(profile.avatar);
    if (!avatarPath) return; // External URL like dicebear
    
    // Mark as attempted to avoid duplicate calls
    userAvatarPrefetchedRef.current = true;
    
    const prefetchUserAvatar = async () => {
      // Check if already cached
      const cached = await getCachedUrl(avatarPath);
      if (cached) {
        prefetchedAvatarsRef.current.add(avatarPath);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('get-signed-url', {
          body: { url: avatarPath, expiresInSeconds: 60 * 60 * 24 },
        });

        if (error || !data?.results?.[avatarPath]) return;

        const signedUrl = data.results[avatarPath];
        // Validate the returned URL is actually signed, not the path echoed back
        if (!signedUrl.startsWith('http')) return;
        await setCachedUrls([{
          path: avatarPath,
          signedUrl,
          expiresAt: Date.now() + 23 * 60 * 60 * 1000,
          priority: 'avatar',
        }]);
        
        prefetchedAvatarsRef.current.add(avatarPath);
        console.log('[AvatarPrefetch] Cached user avatar');
      } catch (err) {
        console.warn('[AvatarPrefetch] Failed to prefetch user avatar:', err);
      }
    };

    // Run immediately, don't wait
    prefetchUserAvatar();
  }, [profile?.avatar, session?.access_token]);

  // Prefetch friends' avatars
  useEffect(() => {
    if (!friends?.length || !session?.access_token || hasPrefetchedRef.current) return;
    
    const prefetchFriendsAvatars = async () => {
      const avatarsToFetch: string[] = [];
      
      for (const friend of friends) {
        if (!friend.avatar) continue;
        
        const avatarPath = extractStoragePath(friend.avatar);
        if (!avatarPath) continue; // External URL
        if (prefetchedAvatarsRef.current.has(avatarPath)) continue;
        
        // Check if already cached
        const cached = await getCachedUrl(avatarPath);
        if (cached) {
          prefetchedAvatarsRef.current.add(avatarPath);
          continue;
        }
        
        avatarsToFetch.push(avatarPath);
      }

      if (avatarsToFetch.length === 0) {
        hasPrefetchedRef.current = true;
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('get-signed-url', {
          body: { urls: avatarsToFetch, expiresInSeconds: 60 * 60 * 24 },
        });

        if (error || !data?.results) return;

        const entries = avatarsToFetch
          .filter(path => data.results[path] && data.results[path].startsWith('http'))
          .map(path => ({
            path,
            signedUrl: data.results[path],
            expiresAt: Date.now() + 23 * 60 * 60 * 1000,
            priority: 'avatar' as const,
          }));

        if (entries.length > 0) {
          await setCachedUrls(entries);
          entries.forEach(e => prefetchedAvatarsRef.current.add(e.path));
          console.log(`[AvatarPrefetch] Cached ${entries.length} friend avatars`);
        }
        
        hasPrefetchedRef.current = true;
      } catch (err) {
        console.warn('[AvatarPrefetch] Failed to prefetch friend avatars:', err);
      }
    };

    prefetchFriendsAvatars();
  }, [friends, session?.access_token]);
}
