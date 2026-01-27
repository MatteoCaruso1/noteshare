
# Plan: Fix Jammer Avatar Sharing Issues

## Summary
Fix two related problems with the Share Note feature when jammers are selected:
1. "Share failed" errors occurring when jammers are added
2. Jammer profile pictures appearing in the preview but missing from the actual shared iMessage cards

## Root Cause Analysis

### Problem 1: Share Failures
The `html-to-image` library fails due to race conditions and incomplete error handling in the avatar conversion pipeline:
- Avatar base64 conversion can silently fail
- The loading state (`isLoadingAvatars`) is cleared before the user clicks share, so there's no waiting for conversion to complete
- If conversion fails, the jammer still appears but with a problematic URL that causes CORS errors

### Problem 2: Preview vs Export Mismatch  
The preview shows avatars correctly because the browser can render images from signed URLs, but the canvas-based export cannot access cross-origin image data:
- The preview renders in the DOM where images load normally
- The `html-to-image` export uses canvas which enforces strict CORS
- Images may appear loaded visually but fail to render in the canvas capture

## Solution

### Step 1: Robust Avatar Pre-loading with Explicit Ready State
Create a more reliable avatar preparation system that:
- Tracks each jammer's avatar status explicitly (loading, ready as base64, or fallback to initials)
- Only marks avatars as "ready" once base64 conversion succeeds
- Provides clear feedback if avatars are still processing

### Step 2: Wait for Avatar Readiness Before Export
Modify `generateImage` to:
- Check if any selected jammers have avatars still being processed
- Wait with a visible loading state until all avatars are either converted to base64 or marked for initials fallback
- Proceed only when the avatar state is definitively resolved

### Step 3: Safer Image Rendering in ShareableNoteCard
Update the card to:
- Only render `<img>` tags for avatars that are confirmed base64 data URLs
- Show initials fallback immediately for any non-base64 avatar
- Remove the fragile `onError` handling that causes preview/export mismatch

### Step 4: Add Pre-export Image Preloading
Before calling `toPng`, explicitly preload all base64 images to ensure they're fully decoded and ready for canvas capture.

## Technical Changes

### File: src/components/ShareNoteDialog.tsx

1. **Add avatar readiness tracking**
   - Replace `jammerAvatars` with a more explicit state that tracks whether each avatar is definitively ready
   - Add a computed `areAvatarsReady` flag that checks all selected jammers

2. **Improve avatar conversion logic**
   - Convert to base64 with explicit success/failure tracking
   - Log failures clearly for debugging
   - Ensure the state only contains confirmed base64 strings

3. **Update generateImage function**
   - Add explicit check and wait for `areAvatarsReady`
   - Show loading/waiting state if avatars are still processing
   - Add image preloading step before toPng call

4. **Disable share buttons while avatars loading**
   - Prevent premature share attempts when jammers are selected but avatars not yet ready

### File: src/components/ShareableNoteCard.tsx

1. **Stricter avatar rendering**
   - Only render `<img>` if avatar string starts with `data:` (confirmed base64)
   - Always show initials as the default, hidden only when base64 image loads
   - Remove onError handler since we now only pass safe base64 URLs

2. **Add Image preloading utility**
   - Create helper to ensure image is fully loaded before render

## Expected Outcome

After implementation:
- Share will reliably work with jammers selected
- Profile pictures will appear correctly in both preview AND exported images
- If avatar conversion fails, users see initials (consistent in both preview and export)
- Clear feedback during avatar processing prevents premature share attempts

## Technical Details

### Key Code Changes

**ShareNoteDialog.tsx - Avatar State Management:**
```text
- Track avatars with explicit status: { [id]: { status: 'loading' | 'ready' | 'failed', base64?: string } }
- Compute areAvatarsReady = all selected jammers have status !== 'loading'
- Disable buttons while !areAvatarsReady && selectedJammerIds.length > 0
```

**ShareNoteDialog.tsx - generateImage Enhancement:**
```text
- Add image preloading: create Image objects for all base64 avatars and wait for onload
- Only proceed with toPng after all images confirmed loaded
- Increase safety timeout
```

**ShareableNoteCard.tsx - Safer Rendering:**
```text
- Check if avatar?.startsWith('data:') before rendering img
- Show initials by default, hide when base64 image present
- Remove onError handler (no longer needed)
```

This approach ensures the preview and export always show identical content, and sharing only proceeds when all assets are definitively ready.
