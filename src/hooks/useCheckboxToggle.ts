import { useCallback, useRef } from 'react';

// Haptic feedback for checkbox interactions
export function triggerHapticFeedback(isChecking: boolean) {
  // Use Vibration API for haptic feedback
  if ('vibrate' in navigator) {
    if (isChecking) {
      // Satisfying "check" feedback - stronger pulse for confirmation
      navigator.vibrate(25);
    } else {
      // Clear "uncheck" feedback - distinct double pulse
      navigator.vibrate([10, 30, 10]);
    }
  }
}

interface UseCheckboxToggleOptions {
  onToggle: (lineIndex: number, isNowChecked: boolean) => void;
  getText: () => string;
  requireDoubleToUncheck?: boolean; // DEPRECATED - kept for API compatibility but ignored
}

export function useCheckboxToggle({ 
  onToggle, 
  getText,
  requireDoubleToUncheck = false // Now disabled by default - single tap for both check and uncheck
}: UseCheckboxToggleOptions) {
  // Track last toggle to prevent rapid double-toggles from touch events
  const lastToggleRef = useRef<{ lineIndex: number; timestamp: number } | null>(null);
  const DEBOUNCE_THRESHOLD = 150; // ms - prevents accidental double-taps

  const toggleCheckbox = useCallback((lineIndex: number): boolean => {
    const text = getText();
    const lines = text.split('\n');
    
    if (lineIndex < 0 || lineIndex >= lines.length) return false;
    
    const line = lines[lineIndex];
    const checkboxMatch = line.match(/^(\s*)(☐|☑)\s/);
    if (!checkboxMatch) return false;
    
    const checkboxChar = checkboxMatch[2];
    const isCurrentlyChecked = checkboxChar === '☑';
    
    // Simple debounce to prevent accidental rapid toggles
    const now = Date.now();
    const lastToggle = lastToggleRef.current;
    
    if (lastToggle && 
        lastToggle.lineIndex === lineIndex && 
        (now - lastToggle.timestamp) < DEBOUNCE_THRESHOLD) {
      // Too quick - ignore this toggle
      return false;
    }
    
    // Record this toggle
    lastToggleRef.current = { lineIndex, timestamp: now };
    
    // Single tap toggles in both directions
    triggerHapticFeedback(!isCurrentlyChecked);
    onToggle(lineIndex, !isCurrentlyChecked);
    return true;
  }, [getText, onToggle]);

  // Get line index from cursor position
  const getLineIndexFromCursor = useCallback((text: string, cursorPos: number): { lineIndex: number; lineStart: number } => {
    const lines = text.split('\n');
    let charCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const lineEnd = charCount + lines[i].length;
      if (cursorPos >= charCount && cursorPos <= lineEnd) {
        return { lineIndex: i, lineStart: charCount };
      }
      charCount = lineEnd + 1;
    }
    
    return { lineIndex: -1, lineStart: 0 };
  }, []);

  // Get line index from Y coordinate - improved for mobile accuracy
  const getLineIndexFromY = useCallback((textarea: HTMLTextAreaElement, clientY: number): number => {
    const rect = textarea.getBoundingClientRect();
    const y = clientY - rect.top;
    const computedStyle = getComputedStyle(textarea);
    const lineHeight = parseInt(computedStyle.lineHeight) || 24;
    const paddingTop = parseInt(computedStyle.paddingTop) || 8;
    const scrollTop = textarea.scrollTop;
    
    // Calculate with better precision for mobile
    const rawLineIndex = (y + scrollTop - paddingTop) / lineHeight;
    return Math.floor(rawLineIndex);
  }, []);

  // Check if X coordinate is in checkbox zone
  // For checked boxes, use a wider zone (100px) to bias towards unchecking
  // For unchecked boxes, use a narrower zone (64px)
  const isInCheckboxZone = useCallback((textarea: HTMLTextAreaElement, clientX: number, isChecked?: boolean): boolean => {
    const rect = textarea.getBoundingClientRect();
    const x = clientX - rect.left;
    const paddingLeft = parseInt(getComputedStyle(textarea).paddingLeft) || 8;
    // Wider zone for checked boxes (100px) to bias towards unchecking
    // Narrower zone for unchecked boxes (64px)
    const zoneWidth = isChecked ? 100 : 64;
    return x < paddingLeft + zoneWidth;
  }, []);

  // Check if cursor is on a checkbox character (with expanded hit area for mobile)
  const isOnCheckbox = useCallback((text: string, cursorPos: number): { isCheckbox: boolean; lineIndex: number } => {
    const { lineIndex, lineStart } = getLineIndexFromCursor(text, cursorPos);
    if (lineIndex === -1) return { isCheckbox: false, lineIndex: -1 };
    
    const lines = text.split('\n');
    const line = lines[lineIndex];
    const checkboxMatch = line.match(/^(\s*)(☐|☑)\s/);
    
    if (!checkboxMatch) return { isCheckbox: false, lineIndex: -1 };
    
    const indent = checkboxMatch[1];
    const checkboxStartInLine = indent.length;
    const clickPosInLine = cursorPos - lineStart;
    
    // Expanded hit area: anywhere from start of line to 5 chars after checkbox
    // This makes it much easier to tap on mobile
    const isCheckbox = clickPosInLine >= 0 && clickPosInLine <= checkboxStartInLine + 5;
    
    return { isCheckbox, lineIndex };
  }, [getLineIndexFromCursor]);

  return {
    toggleCheckbox,
    getLineIndexFromY,
    isInCheckboxZone,
    isOnCheckbox,
    getLineIndexFromCursor,
  };
}
