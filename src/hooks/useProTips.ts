import { useState, useEffect, useRef } from 'react';

const LOGIN_COUNT_KEY = 'noteshare_login_count';
const SHOWN_TIPS_KEY = 'noteshare_pro_tips_shown';
const TIPS_DISABLED_KEY = 'noteshare_pro_tips_disabled';
const SESSION_COUNTED_KEY = 'noteshare_session_counted';
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
 * Increments login count once per browser session and determines if a pro tip should show.
 * Uses sessionStorage to prevent re-counting on page reloads or app updates within the same session.
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

    // Only increment the login count once per browser session
    // sessionStorage survives page reloads within the same tab session
    // but resets when the browser/tab is closed (= a new "login")
    let count = getLoginCount();
    const alreadyCounted = sessionStorage.getItem(SESSION_COUNTED_KEY) === 'true';
    if (!alreadyCounted) {
      count += 1;
      try {
        localStorage.setItem(LOGIN_COUNT_KEY, count.toString());
        sessionStorage.setItem(SESSION_COUNTED_KEY, 'true');
      } catch {}
    }

    // Only show on every Nth login
    if (count % LOGIN_INTERVAL !== 0) return;

    // Don't re-show a tip we already showed this session
    const sessionTipShown = sessionStorage.getItem('noteshare_tip_shown_this_session') === 'true';
    if (sessionTipShown) return;

    // Find next unshown tip
    const nextTip = [0, 1, 2, 3, 4].find(i => !shownTips.includes(i));
    if (nextTip === undefined) return;

    setTipIndex(nextTip);
  }, [profileId]);

  const markTipShown = (index: number) => {
    const shown = getShownTips();
    if (!shown.includes(index)) {
      shown.push(index);
      try {
        localStorage.setItem(SHOWN_TIPS_KEY, JSON.stringify(shown));
        sessionStorage.setItem('noteshare_tip_shown_this_session', 'true');
      } catch {}
    }
    setTipIndex(null);
  };

  return { tipIndex, markTipShown };
}
