// Utilities to recover from rare cases where Radix/overlay stacks leave the
// document scroll-locked after a Sheet/Dialog is closed.

export function isAnyOverlayOpen(): boolean {
  return Boolean(
    document.querySelector('[role="dialog"][data-state="open"]') ||
      document.querySelector('[data-radix-dialog-overlay]') ||
      document.querySelector('[data-vaul-drawer]'),
  );
}

export function clearDocumentScrollLocks(): void {
  // Inline style locks
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
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
