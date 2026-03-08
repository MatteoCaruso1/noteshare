

# Per-Audio Privacy Toggle

## Overview
Add a toggle on each audio file item that lets users mark individual recordings as public or private. Private recordings are hidden from friends even if the post itself is shared. The owner always sees all their own recordings.

## Database Change

Add a `private_audio_indices` column to the `notes` table -- an integer array storing the indices of audio files the user has marked private. This avoids a new table and keeps the data co-located with existing audio arrays.

```sql
ALTER TABLE public.notes
ADD COLUMN private_audio_indices integer[] NOT NULL DEFAULT '{}';
```

No new RLS policies needed -- existing notes UPDATE policy already restricts to owner only.

## UI Changes

### 1. Trash button styling (AudioFileItem.tsx)
- Change from `variant="outline"` to `variant="ghost"` with explicit `border border-border` class and `bg-transparent` to get a white/transparent outline-only look.

### 2. Privacy toggle in AudioFileItem
- Add a new prop `isPrivate: boolean` and `onTogglePrivacy: () => void`
- Render a compact toggle to the left of the trash button: `Users` icon (public) on left, `Lock` icon (private) on right, with a `Switch` component between them
- Toast on every flip: "Recording set to private" / "Recording set to public"

### 3. NoteCard.tsx -- owner viewing
- When rendering audio files, pass `isPrivate` and `onTogglePrivacy` to `AudioFileItem` (edit mode) or show a small lock icon on `WaveformPlayer` entries (display mode)
- Create a new mutation hook `useUpdateNotePrivateAudios` that updates `private_audio_indices` on the note

### 4. NoteCard.tsx -- friend viewing (filtering)
- When `!isOwner`, filter out audio files whose index is in `note.private_audio_indices` before rendering
- Also filter the corresponding `audio_file_names` entries
- This is a pure client-side filter with zero extra queries

### 5. FriendsFeed / other views
- The same filtering applies anywhere `NoteCard` is rendered for non-owner notes, since the logic lives inside `NoteCard` itself

### 6. Hook: useUpdateNotePrivateAudios (in useUpdateNote.ts)
- Simple mutation: updates `private_audio_indices` on the note
- Optimistic update on `['note', noteId]` and `['notes']`
- Invalidates `['notes']`, `['friends-notes']`, `['note']`

## Data Flow
- `notes.private_audio_indices` stores `[1, 3]` meaning audio at index 1 and 3 are private
- Default is `[]` (all public)
- Owner toggles an index: if present, remove it (make public); if absent, add it (make private)
- Friends see `note.audio_files.filter((_, i) => !privateSet.has(i))`

## Performance
- No new queries, no new tables, no new RLS policies
- Single column added to existing `notes` rows (already fetched)
- Client-side index filtering is O(n) where n = number of audio files per note (typically 1-3)
- Toggle mutation is a single UPDATE on one row

## Files Modified
1. `src/components/AudioFileItem.tsx` -- trash button style + privacy toggle UI
2. `src/hooks/useUpdateNote.ts` -- new `useUpdateNotePrivateAudios` mutation
3. `src/components/NoteCard.tsx` -- wire toggle for owner, filter for friends
4. `src/types/index.ts` -- add `private_audio_indices` to Note type (if not auto-generated)
5. Database migration -- add column

## What Won't Change
- QuickNoteCapture, AddNoteDialog, GroupPostCapture -- these are pre-save UIs where audio privacy isn't relevant yet (defaults to public)
- No changes to RLS, storage, or edge functions
- No changes to how audio files are uploaded or stored

