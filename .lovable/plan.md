

## Diagnosis

The "Failed to load video" error occurs because of **two compounding issues**:

1. **RLS blocks non-owners**: The `notes-media` storage bucket has RLS policies that only allow the file owner (`auth.uid()`) to read files. When a friend tries to view the video, the direct `supabase.storage.createSignedUrl()` call in `NoteVideoPlayer` is rejected by RLS.

2. **Edge function misroutes `notes-media` paths**: The `get-signed-url` edge function (which uses the service-role key and bypasses RLS) assumes all non-HTTP paths belong to the `practice-media` bucket (line 20). Video paths stored as plain strings like `userId/fileId.webm` would be incorrectly routed to `practice-media` instead of `notes-media`.

Audio and image files work for friends because they are stored in the `practice-media` bucket and go through the edge function via `useSignedUrl`. Videos bypass this entire system.

## Plan

### 1. Route `NoteVideoPlayer` through the existing `useSignedUrl` hook
- **File**: `src/components/NoteCard.tsx`
- Replace the direct `supabase.storage.from('notes-media').createSignedUrl()` calls with `useSignedUrl()` for both the video URL and thumbnail URL
- Since video paths are stored as plain paths (e.g. `userId/fileId.webm`), they need to be prefixed so the edge function knows which bucket to use
- Construct a full storage URL using the Supabase URL so `parseStorageRef` in the edge function can extract the correct bucket

### 2. Fix the edge function's bucket detection for bare paths
- **File**: `supabase/functions/get-signed-url/index.ts`
- Update `parseStorageRef` to handle `notes-media/` prefixed paths (e.g. `notes-media/userId/file.webm`) in addition to the existing `practice-media` default
- This makes the edge function correctly route to the right bucket regardless of how the path is stored

### 3. Construct proper storage references in NoteVideoPlayer
- Prepend `notes-media/` to video paths before passing them to `useSignedUrl` or `getSignedUrls`, so the edge function routes them to the correct bucket
- Do the same for video thumbnail paths
- Remove the manual `handlePlay` state machine since `useSignedUrl` handles loading/error states

### Files to change
- `src/components/NoteCard.tsx` — rewrite `NoteVideoPlayer` to use `useSignedUrl`
- `supabase/functions/get-signed-url/index.ts` — handle `notes-media/` prefix in `parseStorageRef`

