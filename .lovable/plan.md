
# Plan: Fix Group Creation RLS Error on Mobile

## Problem Analysis

The user is experiencing a "new row violates row-level security policy for table 'groups'" error when creating a group on mobile (production). After investigation, I've identified the root cause:

### Current Flow
1. Client code inserts a group with `owner_id: profile.id` (the UUID from the profiles table)
2. RLS policy checks: `WITH CHECK (owner_id = my_profile_id())`
3. The `my_profile_id()` function queries: `SELECT p.id FROM profiles p WHERE p.user_id = auth.uid()`

### Root Cause
The `my_profile_id()` function can return `NULL` in edge cases:
- **Timing issue**: On mobile, there might be a slight delay/race condition where `auth.uid()` is set but the database query context hasn't fully propagated
- **Cache/session issue**: Mobile browsers might have stale authentication state
- **Network latency**: The function executes on the database server, and there could be a mismatch between client-side auth state and server-side auth context

The RLS check `owner_id = my_profile_id()` fails when:
- `owner_id` = valid profile UUID (e.g., `608221f9-5055-4b71-93d7-02d2e8d20a3a`)
- `my_profile_id()` returns `NULL` (no matching profile found)
- Result: `valid_uuid = NULL` → **FALSE** → RLS violation

## Solution

Replace the helper function approach with an inline EXISTS check that's more robust and commonly used throughout the codebase. This pattern is already proven to work in other tables like `projects`, `notes`, `goals`, etc.

### Technical Implementation

**Migration SQL:**
```sql
-- Drop the current policy that uses my_profile_id()
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;

-- Create a new policy using the proven inline EXISTS pattern
CREATE POLICY "Users can create groups"
ON public.groups
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = groups.owner_id 
      AND profiles.user_id = auth.uid()
  )
);
```

### Why This Fix Works

1. **Inline EXISTS is more reliable**: The subquery executes in the same transaction context as the INSERT, ensuring auth.uid() is properly set
2. **Proven pattern**: This exact pattern is used successfully in `projects`, `notes`, `promo_posts`, and other tables without issues
3. **No function dependency**: Eliminates potential NULL return from `my_profile_id()` function
4. **Better error handling**: The EXISTS clause is more explicit about what it's checking

### Verification Steps
1. User creates a test group on mobile production
2. No RLS error should occur
3. Group should be created successfully with proper owner_id

## Files to Modify

- **New migration file**: `supabase/migrations/[timestamp]_fix-group-creation-rls.sql`
  - Drop current INSERT policy
  - Create new policy with inline EXISTS check

## Technical Notes

- The `my_profile_id()` helper function will remain in the database (used by other policies)
- Only the INSERT policy on `groups` table will change
- This doesn't affect existing groups or other RLS policies (SELECT, UPDATE, DELETE)
- The fix is backwards compatible - no data migration needed

## Success Criteria

✅ User can create groups on mobile production without RLS errors
✅ The `owner_id` properly matches the authenticated user's profile
✅ Group membership row is successfully created after group creation
