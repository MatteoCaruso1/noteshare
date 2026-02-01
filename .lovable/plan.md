
# Plan: Bulletproof Audio Recording System

## Problem Summary
A 50-minute audio recording disappeared when pressing stop. This is unacceptable for a practice workflow tool. We need to ensure recordings are never lost and users always know the status of their recording.

## Root Causes Identified

1. **Silent failure modes** - Recording can fail without clear user feedback
2. **No blob backup** - If upload fails, the recording is lost forever
3. **Insufficient upload progress feedback** - Large files may timeout without indication
4. **Memory issues on long mobile recordings** - Chunks could be lost
5. **Blob validation failure** - Empty blobs are quietly rejected

---

## Implementation Plan

### Phase 1: Immediate Safeguards in AudioRecorder

**1.1 Add robust chunk accumulation logging**
- Add detailed logging for every `ondataavailable` event
- Track cumulative size in state for visibility
- Show recording size indicator to user

**1.2 Implement blob backup before upload**
- Before calling `onRecorded`, store the blob in IndexedDB as a backup
- Only clear the backup after successful upload confirmation
- This ensures no recording is ever permanently lost

**1.3 Add visual feedback during processing**
- Show "Processing recording..." state between stop and upload
- Show upload progress percentage for large files
- Show explicit success/failure toasts

### Phase 2: Enhanced Upload Flow

**2.1 Add retry logic for failed uploads**
- If upload fails, retry up to 3 times with exponential backoff
- Store failed uploads for later retry

**2.2 Chunk large uploads**
- For recordings over 10MB, consider chunked upload approach
- This prevents timeout issues

**2.3 Add upload progress tracking**
- Modify `useMediaUpload` to track and expose upload progress
- Show progress bar during upload

### Phase 3: Recovery System

**3.1 Create pending recordings recovery UI**
- Check IndexedDB on app load for any orphaned recordings
- Show banner: "You have an unsaved recording. Tap to recover."

**3.2 Add recording session persistence**
- Store recording metadata (start time, expected duration) in localStorage
- If app crashes during recording, offer recovery on next load

---

## Technical Changes

### File: `src/lib/recordingBackup.ts` (NEW)
Create a new utility for IndexedDB-based recording backup:
- `saveRecordingBackup(blob, metadata)` - Saves blob with timestamp
- `getPendingBackups()` - Lists any orphaned recordings
- `clearBackup(id)` - Removes backup after successful upload
- `getBackup(id)` - Retrieves a saved recording

### File: `src/components/AudioRecorder.tsx`
- Add cumulative size tracking displayed to user during recording
- Add "Processing..." state between stop and upload callback
- Add detailed error logging with chunk counts
- Store blob to IndexedDB before passing to `onRecorded`
- Show toast with recording size when complete

### File: `src/hooks/useMediaUpload.ts`
- Add upload progress percentage using XMLHttpRequest (Supabase SDK doesn't expose progress)
- Add retry logic with exponential backoff (1s, 2s, 4s)
- Add explicit success toast on upload complete
- Return progress state for UI consumption

### File: `src/components/AudioFileItem.tsx`
- Show upload progress bar if upload is in progress
- Show "Uploading..." indicator with percentage

### File: `src/components/RecordingRecoveryBanner.tsx` (NEW)
- Check for pending backups on mount
- Display dismissible banner with recovery option
- Allow user to re-attempt upload or discard

### File: `src/components/QuickNoteCapture.tsx` & `src/components/PracticeControls.tsx`
- Add `RecordingRecoveryBanner` component
- Update `handleAudioRecorded` to wait for upload confirmation
- Show clear success/failure feedback

---

## User Experience Improvements

| Scenario | Current Behavior | New Behavior |
|----------|-----------------|--------------|
| Recording stops | Silent processing | "Processing 45.2 MB recording..." toast |
| Upload starts | No indication | Progress bar appears on audio item |
| Upload succeeds | Audio appears in list | Audio appears + "Recording saved!" toast |
| Upload fails | Audio doesn't appear, no error | Toast error + "Retry" option + backup preserved |
| App crashes during recording | Recording lost forever | Recovery banner on next load |
| Large file timeout | Silent failure | Retry with chunked upload |

---

## Technical Details

### IndexedDB Backup Schema
```text
Database: noteshare_recordings
Store: pending_recordings
  - id: auto-increment
  - blob: Blob
  - duration: number
  - createdAt: timestamp
  - userId: string
  - status: 'pending' | 'uploading' | 'failed'
```

### Recording Size Display
During recording, show format:
- Under 1 MB: "Recording... (0.5 MB)"
- 1-50 MB: "Recording... (23.4 MB)"
- Over 50 MB: "Recording... (52.1 MB) - Large file"

---

## Testing Checklist
- Record 1-minute audio and verify save works
- Record 10-minute audio and verify upload completes
- Simulate network failure during upload and verify retry
- Kill app during recording and verify recovery on reload
- Test on iOS Safari with 30-minute recording
- Verify upload progress is visible

---

## Summary

This plan transforms the audio recording system from "fire and forget" to a robust, recoverable system where:

1. Users always see what's happening (processing, uploading, progress)
2. Recordings are backed up before upload attempt
3. Failed uploads can be retried
4. Crashed recordings can be recovered
5. Large file uploads show progress and don't silently timeout

No more lost 50-minute recordings.
