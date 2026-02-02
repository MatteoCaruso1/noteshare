export type ScrollContainer = Window | HTMLElement;

function isWindow(container: ScrollContainer): container is Window {
  return typeof (container as Window).scrollTo === 'function' && container === window;
}

/**
 * Best-effort scroll container detection.
 * - If inside a Radix ScrollArea viewport, preserve that scrollTop
 * - Otherwise preserve the window scrollY
 */
export function getScrollContainerFor(el: HTMLElement): ScrollContainer {
  const viewport = el.closest('[data-radix-scroll-area-viewport]');
  return (viewport as HTMLElement) || window;
}

export function getScrollTop(container: ScrollContainer): number {
  return isWindow(container) ? window.scrollY : container.scrollTop;
}

export function setScrollTop(container: ScrollContainer, top: number): void {
  if (isWindow(container)) {
    if (window.scrollY !== top) {
      window.scrollTo({ top, left: 0, behavior: 'auto' });
    }
  } else {
    if (container.scrollTop !== top) {
      container.scrollTop = top;
    }
  }
}

/**
 * Restores scroll position on the next frame.
 * Useful after DOM updates, selection changes, and mobile focus heuristics.
 */
export function restoreScrollNextFrame(container: ScrollContainer, top: number): void {
  requestAnimationFrame(() => setScrollTop(container, top));
}

/**
 * Focuses an element without scrolling the page (where supported).
 */
export function focusWithoutScroll<T extends HTMLElement>(el: T): void {
  try {
    // preventScroll is supported on modern browsers; TS lib.dom types may not include it.
    (el as unknown as { focus: (opts?: { preventScroll?: boolean }) => void }).focus({ preventScroll: true });
  } catch {
    el.focus();
  }
}
