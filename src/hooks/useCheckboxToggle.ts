import { useCallback, useRef } from 'react';

// Haptic feedback for checkbox interactions
export function triggerHapticFeedback(isChecking: boolean) {
  // Use Vibration API for haptic feedback
  if ('vibrate' in navigator) {
    if (isChecking) {
      // Satisfying "check" feedback - single crisp pulse
      navigator.vibrate(15);
    } else {
      // Gentler "uncheck" feedback - softer pulse
      navigator.vibrate(8);
    }
  }
}

interface UseCheckboxToggleOptions {
  onToggle: (lineIndex: number, isNowChecked: boolean) => void;
  getText: () => string;
  requireDoubleToUncheck?: boolean;
}

export function useCheckboxToggle({ 
  onToggle, 
  getText,
  requireDoubleToUncheck = true 
}: UseCheckboxToggleOptions) {
  // Track recent uncheck attempts for double-tap protection
  const lastUncheckAttempt = useRef<{ lineIndex: number; timestamp: number } | null>(null);
  const DOUBLE_TAP_THRESHOLD = 400; // ms

  const toggleCheckbox = useCallback((lineIndex: number): boolean => {
    const text = getText();
    const lines = text.split('\n');
    
    if (lineIndex < 0 || lineIndex >= lines.length) return false;
    
    const line = lines[lineIndex];
    const checkboxMatch = line.match(/^(\s*)(☐|☑)\s/);
    if (!checkboxMatch) return false;
    
    const checkboxChar = checkboxMatch[2];
    const isCurrentlyChecked = checkboxChar === '☑';
    
    // If unchecking with protection enabled, require double-tap
    if (isCurrentlyChecked && requireDoubleToUncheck) {
      const now = Date.now();
      const lastAttempt = lastUncheckAttempt.current;
      
      if (lastAttempt && 
          lastAttempt.lineIndex === lineIndex && 
          (now - lastAttempt.timestamp) < DOUBLE_TAP_THRESHOLD) {
        // Second tap within threshold - allow uncheck
        lastUncheckAttempt.current = null;
        triggerHapticFeedback(false);
        onToggle(lineIndex, false);
        return true;
      } else {
        // First tap - record and give subtle feedback, but don't toggle
        lastUncheckAttempt.current = { lineIndex, timestamp: now };
        // Subtle feedback to indicate "tap again to uncheck"
        if ('vibrate' in navigator) {
          navigator.vibrate(5);
        }
        return false;
      }
    }
    
    // Checking (or unchecking without protection)
    triggerHapticFeedback(!isCurrentlyChecked);
    onToggle(lineIndex, !isCurrentlyChecked);
    return true;
  }, [getText, onToggle, requireDoubleToUncheck]);

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

  // Get line index from Y coordinate
  const getLineIndexFromY = useCallback((textarea: HTMLTextAreaElement, clientY: number): number => {
    const rect = textarea.getBoundingClientRect();
    const y = clientY - rect.top;
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
    const paddingTop = parseInt(getComputedStyle(textarea).paddingTop) || 8;
    const scrollTop = textarea.scrollTop;
    
    return Math.floor((y + scrollTop - paddingTop) / lineHeight);
  }, []);

  // Check if X coordinate is in checkbox zone
  const isInCheckboxZone = useCallback((textarea: HTMLTextAreaElement, clientX: number): boolean => {
    const rect = textarea.getBoundingClientRect();
    const x = clientX - rect.left;
    const paddingLeft = parseInt(getComputedStyle(textarea).paddingLeft) || 8;
    // Checkbox zone is roughly the first 40px from text start
    return x < paddingLeft + 40;
  }, []);

  // Check if cursor is on a checkbox character
  const isOnCheckbox = useCallback((text: string, cursorPos: number): { isCheckbox: boolean; lineIndex: number } => {
    const { lineIndex, lineStart } = getLineIndexFromCursor(text, cursorPos);
    if (lineIndex === -1) return { isCheckbox: false, lineIndex: -1 };
    
    const lines = text.split('\n');
    const line = lines[lineIndex];
    const checkboxMatch = line.match(/^(\s*)(☐|☑)\s/);
    
    if (!checkboxMatch) return { isCheckbox: false, lineIndex: -1 };
    
    const indent = checkboxMatch[1];
    const checkboxStartInLine = indent.length;
    const checkboxEndInLine = checkboxStartInLine + 1;
    const clickPosInLine = cursorPos - lineStart;
    
    // Check if on or right after the checkbox character
    const isCheckbox = clickPosInLine >= checkboxStartInLine && clickPosInLine <= checkboxEndInLine + 1;
    
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
