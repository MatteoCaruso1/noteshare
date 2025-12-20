/**
 * Global Audio Manager
 * Ensures only one audio element plays at a time across the entire app.
 * Also handles recording state to prevent conflicts.
 */

type AudioElement = HTMLAudioElement | { pause: () => void; paused?: boolean };

class AudioManager {
  private currentlyPlaying: AudioElement | null = null;
  private wavesurferInstances: Map<string, { pause: () => void; isPlaying: () => boolean }> = new Map();
  private isRecording: boolean = false;
  private recordingListeners: Set<(isRecording: boolean) => void> = new Set();

  /**
   * Register that an audio element is about to play.
   * This will pause any currently playing audio.
   */
  play(element: AudioElement, id?: string): void {
    // Pause any currently playing audio
    if (this.currentlyPlaying && this.currentlyPlaying !== element) {
      try {
        this.currentlyPlaying.pause();
      } catch (e) {
        console.warn('[AudioManager] Failed to pause previous audio:', e);
      }
    }

    // Pause all wavesurfer instances except the one that's about to play
    this.wavesurferInstances.forEach((instance, instanceId) => {
      if (instanceId !== id && instance.isPlaying()) {
        try {
          instance.pause();
        } catch (e) {
          console.warn('[AudioManager] Failed to pause wavesurfer:', e);
        }
      }
    });

    this.currentlyPlaying = element;
  }

  /**
   * Register that an audio element has stopped playing.
   */
  stop(element: AudioElement): void {
    if (this.currentlyPlaying === element) {
      this.currentlyPlaying = null;
    }
  }

  /**
   * Register a WaveSurfer instance for management
   */
  registerWavesurfer(id: string, instance: { pause: () => void; isPlaying: () => boolean }): void {
    this.wavesurferInstances.set(id, instance);
  }

  /**
   * Unregister a WaveSurfer instance
   */
  unregisterWavesurfer(id: string): void {
    this.wavesurferInstances.delete(id);
  }

  /**
   * Pause all currently playing audio
   */
  pauseAll(): void {
    if (this.currentlyPlaying) {
      try {
        this.currentlyPlaying.pause();
      } catch (e) {
        console.warn('[AudioManager] Failed to pause current audio:', e);
      }
      this.currentlyPlaying = null;
    }

    this.wavesurferInstances.forEach((instance) => {
      if (instance.isPlaying()) {
        try {
          instance.pause();
        } catch (e) {
          console.warn('[AudioManager] Failed to pause wavesurfer:', e);
        }
      }
    });
  }

  /**
   * Set recording state - pauses all playback when recording starts
   */
  setRecording(recording: boolean): void {
    this.isRecording = recording;
    if (recording) {
      this.pauseAll();
    }
    this.recordingListeners.forEach(listener => listener(recording));
  }

  /**
   * Check if currently recording
   */
  getRecordingState(): boolean {
    return this.isRecording;
  }

  /**
   * Subscribe to recording state changes
   */
  onRecordingChange(listener: (isRecording: boolean) => void): () => void {
    this.recordingListeners.add(listener);
    return () => this.recordingListeners.delete(listener);
  }
}

// Export singleton instance
export const audioManager = new AudioManager();
