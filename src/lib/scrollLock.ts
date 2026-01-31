// Utilities to recover from rare cases where Radix/overlay stacks leave the
// document scroll-locked after a Sheet/Dialog is closed.

export function isAnyOverlayOpen(): boolean {
  return Boolean(
    document.querySelector('[role="dialog"][data-state="open"]') ||
      document.querySelector('[data-radix-dialog-overlay]') ||
      document.querySelector('[data-vaul-drawer]'),
  );
}

/**
 * Detects whether the document currently has any scroll-lock applied.
 * Checks for:
 * - Radix/Vaul attributes (data-scroll-locked)
 * - CSS classes (overflow-hidden)
 * - Inline styles (overflow, position, pointerEvents)
 */
export function hasDocumentScrollLock(): boolean {
  const body = document.body;
  const html = document.documentElement;

  return (
    // Attribute-based locks
    body.hasAttribute('data-scroll-locked') ||
    html.hasAttribute('data-scroll-locked') ||
    // Class-based locks
    body.classList.contains('overflow-hidden') ||
    html.classList.contains('overflow-hidden') ||
    // Inline style locks
    body.style.overflow === 'hidden' ||
    body.style.overflowY === 'hidden' ||
    html.style.overflow === 'hidden' ||
    body.style.position === 'fixed' ||
    body.style.pointerEvents === 'none'
  );
}

export function clearDocumentScrollLocks(): void {
  // Inline style locks
  document.documentElement.style.overflow = '';
  document.documentElement.style.overflowY = '';
  document.body.style.overflow = '';
  document.body.style.overflowY = '';
  document.body.style.paddingRight = '';
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  document.body.style.pointerEvents = '';

  // Attribute/class locks used by Radix/other libs
  document.body.removeAttribute('data-scroll-locked');
  document.documentElement.removeAttribute('data-scroll-locked');
  document.documentElement.classList.remove('overflow-hidden');
  document.body.classList.remove('overflow-hidden');
}

/**
 * Best-effort cleanup after closing an overlay.
 * Waits a beat for exit animations to finish, then unlocks if nothing is open.
 */
export function unlockScrollAfterClose(delayMs = 300): void {
  window.setTimeout(() => {
    if (!isAnyOverlayOpen()) clearDocumentScrollLocks();
  }, delayMs);
}

/**
 * Immediately clears scroll locks if no overlay is open.
 * Useful for periodic watchdog checks.
 */
export function unlockScrollIfSafe(): void {
  if (!isAnyOverlayOpen() && hasDocumentScrollLock()) {
    clearDocumentScrollLocks();
  }
}
