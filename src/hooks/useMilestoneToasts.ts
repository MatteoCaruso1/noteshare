import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Provides one-time milestone toast triggers for:
 * - First note ever
 * - First 10 notes (lifetime)
 * - First friend added
 *
 * Each milestone fires once, is persisted in the profiles table,
 * and is guarded against double-fire via refs.
 */
export function useMilestoneToasts() {
  const { profile, refreshProfile } = useAuth();
  const claimingFirstNote = useRef(false);
  const claimingTenNotes = useRef(false);
  const claimingFirstFriend = useRef(false);

  const showMilestoneToast = useCallback((title: string, body: string) => {
    toast(title, {
      description: body,
      duration: 4000,
      className:
        'milestone-toast border-l-4 border-l-primary bg-card shadow-lg',
    });
  }, []);

  /** Call after a note is created. totalCount = lifetime notes after insert. */
  const checkNoteMilestones = useCallback(
    async (totalCount: number) => {
      if (!profile) return;

      // --- First note ---
      if (
        totalCount >= 1 &&
        !profile.has_logged_first_note &&
        !claimingFirstNote.current
      ) {
        claimingFirstNote.current = true;
        const { error } = await supabase
          .from('profiles')
          .update({ has_logged_first_note: true })
          .eq('id', profile.id);
        if (error) {
          claimingFirstNote.current = false;
          return;
        }
        showMilestoneToast(
          'First practice logged.',
          'This is how progress begins.',
        );
        await refreshProfile();
      }

      // --- 10 notes ---
      if (
        totalCount >= 10 &&
        !profile.has_logged_ten_notes &&
        !claimingTenNotes.current
      ) {
        claimingTenNotes.current = true;
        const { error } = await supabase
          .from('profiles')
          .update({ has_logged_ten_notes: true })
          .eq('id', profile.id);
        if (error) {
          claimingTenNotes.current = false;
          return;
        }
        showMilestoneToast('10 sessions logged.', 'Real work compounds.');
        await refreshProfile();
      }
    },
    [profile, refreshProfile, showMilestoneToast],
  );

  /** Call when a friendship is accepted. */
  const checkFriendMilestone = useCallback(async () => {
    if (!profile || profile.has_added_first_friend || claimingFirstFriend.current)
      return;

    claimingFirstFriend.current = true;

    // Check if user now has at least one accepted friendship
    const { count, error: countError } = await supabase
      .from('friendships')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'accepted')
      .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`);

    if (countError || !count || count < 1) {
      claimingFirstFriend.current = false;
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ has_added_first_friend: true })
      .eq('id', profile.id);

    if (error) {
      claimingFirstFriend.current = false;
      return;
    }

    showMilestoneToast(
      'First connection made.',
      'Practicing with others raises the standard.',
    );
    await refreshProfile();
  }, [profile, refreshProfile, showMilestoneToast]);

  return { checkNoteMilestones, checkFriendMilestone };
}
