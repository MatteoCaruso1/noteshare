// Only let user-entered links open web pages. Anything else (javascript:, data:, ...)
// is dropped, so a link in a gig or post can never run script on notesharemusic.com.
export function safeHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url.trim(), window.location.origin);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : undefined;
  } catch {
    return undefined;
  }
}
