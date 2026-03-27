import { useState, useEffect, useRef } from 'react';

const LOGIN_COUNT_KEY = 'noteshare_login_count';
const SHOWN_TIPS_KEY = 'noteshare_pro_tips_shown';
const TIPS_DISABLED_KEY = 'noteshare_pro_tips_disabled';
const LOGIN_INTERVAL = 8;
const TOTAL_TIPS = 5;

function getLoginCount(): number {
  try { return parseInt(localStorage.getItem(LOGIN_COUNT_KEY) || '0', 10); } catch { return 0; }
}

function getShownTips(): number[] {
  try { return JSON.parse(localStorage.getItem(SHOWN_TIPS_KEY) || '[]'); } catch { return []; }
}

function getTipsDisabled(): boolean {
  try { return localStorage.getItem(TIPS_DISABLED_KEY) === 'true'; } catch { return false; }
}

export function setTipsDisabled(disabled: boolean) {
  try { localStorage.setItem(TIPS_DISABLED_KEY, disabled.toString()); } catch {}
}

export function isTipsDisabled(): boolean {
  return getTipsDisabled();
}

/**
 * Increments login count and determines if a pro tip should show.
 * Returns the tip index (0-4) to show, or null.
 */
export function useProTips(profileId: string | undefined) {
  const [tipIndex, setTipIndex] = useState<number | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (!profileId || processedRef.current) return;
    processedRef.current = true;

    if (getTipsDisabled()) return;

    const shownTips = getShownTips();
    // All tips already shown — done forever
    if (shownTips.length >= TOTAL_TIPS) return;

    // Increment login count
    const count = getLoginCount() + 1;
    try { localStorage.setItem(LOGIN_COUNT_KEY, count.toString()); } catch {}

    // Only show on every Nth login
    if (count % LOGIN_INTERVAL !== 0) return;

    // Find next unshown tip
    const nextTip = [0, 1, 2, 3, 4].find(i => !shownTips.includes(i));
    if (nextTip === undefined) return;

    setTipIndex(nextTip);
  }, [profileId]);

  const markTipShown = (index: number) => {
    const shown = getShownTips();
    if (!shown.includes(index)) {
      shown.push(index);
      try { localStorage.setItem(SHOWN_TIPS_KEY, JSON.stringify(shown)); } catch {}
    }
    setTipIndex(null);
  };

  return { tipIndex, markTipShown };
}
