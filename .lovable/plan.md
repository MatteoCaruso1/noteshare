

# Fix Note Detail Loading Performance (Statement Timeouts)

## Problem
Note detail pages (and comment loading) are failing with **database statement timeouts** (error code 57014). Queries take 10+ seconds and get cancelled by the database. This affects both your own notes and friends' notes.

## Root Cause
The database security policies on `notes` and `note_comments` tables use complex nested queries to check friendship status, but **critical database indexes are missing**. Without indexes, the database scans every row in multiple tables for every single query, causing timeouts as data grows.

### Missing indexes identified:
- `notes.author_id` -- checked in almost every security policy
- `notes.session_id` -- used in joins when loading note details
- `notes.project_id` -- used in joins and security policies
- `notes.visibility` -- filtered in friendship visibility checks
- `note_comments.note_id` -- every comment query filters by this
- `note_comments.author_id` -- security policy checks this
- `friendships.addressee_id` -- friendship lookups (only a composite index on requester+addressee exists, not a standalone addressee index)
- `friendships.status` -- filtered as `status = 'accepted'` in every friendship check

## Solution

### Step 1: Add database indexes (single migration)

Create indexes on all the columns used in security policy checks and query joins:

```sql
-- Notes table: core columns used in RLS and queries
CREATE INDEX IF NOT EXISTS idx_notes_author_id ON public.notes (author_id);
CREATE INDEX IF NOT EXISTS idx_notes_session_id ON public.notes (session_id);
CREATE INDEX IF NOT EXISTS idx_notes_project_id ON public.notes (project_id);
CREATE INDEX IF NOT EXISTS idx_notes_visibility ON public.notes (visibility);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes (created_at DESC);

-- Note comments: columns used in RLS and queries
CREATE INDEX IF NOT EXISTS idx_note_comments_note_id ON public.note_comments (note_id);
CREATE INDEX IF NOT EXISTS idx_note_comments_author_id ON public.note_comments (author_id);

-- Friendships: standalone index on addressee_id for reverse lookups
CREATE INDEX IF NOT EXISTS idx_friendships_addressee_id ON public.friendships (addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships (status);
```

### Step 2: No code changes needed

The queries and security policies themselves are fine -- they just need indexes to perform efficiently. Once indexes are in place, the same queries that currently timeout should complete in milliseconds.

## Expected Result
- Note detail pages load in under 1-2 seconds instead of timing out
- Friends feed loads reliably
- Comment sections appear immediately
- No more 500 errors from statement timeouts

