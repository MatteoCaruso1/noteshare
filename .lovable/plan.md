

## Fix: Waveform scrubber and time not updating during playback on mobile

### Problem

When seeking partway through a waveform on mobile and pressing play, the audio plays but the time display stays frozen and the scrubber (progress bar) doesn't move. This happens intermittently -- only on "some" waveforms.

### Root Cause

The time/scrubber updates rely entirely on WaveSurfer's `audioprocess` event. With the `MediaElement` backend (used for iOS compatibility), this event depends on the underlying HTML5 `<audio>` element's `timeupdate` event. On mobile Safari, `timeupdate` can stop firing or fire very infrequently after a seek, especially when the audio element's internal state gets out of sync. Since the React state for `currentTime` only updates inside that callback, the UI freezes.

### Solution

Replace the passive `audioprocess` event listener with an active `requestAnimationFrame` polling loop that runs while playback is active. This reads `getCurrentTime()` directly from the WaveSurfer instance on every animation frame, guaranteeing smooth, consistent updates regardless of whether the browser fires `timeupdate` events.

### Technical Changes

**`src/components/WaveformPlayer.tsx`**:

1. Add a `rafRef` (requestAnimationFrame ID ref) for cleanup
2. Remove the `audioprocess` event listener
3. Add a `useEffect` that starts a `requestAnimationFrame` loop when `isPlaying` is `true` and `isReady` is `true`, calling `wavesurferRef.current.getCurrentTime()` each frame to update `currentTime` state
4. The loop self-cancels when `isPlaying` becomes `false`

This is a minimal, targeted change -- no visual or behavioral differences except that the scrubber and time now reliably update on mobile.

