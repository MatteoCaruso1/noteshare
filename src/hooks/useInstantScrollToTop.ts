import { useLayoutEffect } from 'react';

/**
 * Instantly scrolls to the top of the page before the browser paints.
 * Use this on pages that should always start at the top.
 */
export function useInstantScrollToTop(deps: React.DependencyList = []) {
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, deps);
}
