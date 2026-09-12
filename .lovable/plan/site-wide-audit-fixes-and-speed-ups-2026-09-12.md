# Site-wide audit: fixes and speed-ups

I ran a full pass over the app: type checking, code linting, a database security check, a dependency vulnerability scan, a production build size measurement, and an automated browser sweep of the public pages (home, pricing, blog, science of practice, sign in, AI page, and a bad URL) watching for errors and wasted network calls.

Good news first: the app builds cleanly, there are no type errors, no crashes on any page tested, and no known-vulnerable packages.

Below is what I found and what I'd fix.

## Real bugs found

1. **Every visitor to the public pages quietly fires a request for notifications, even when nobody is signed in.** It fails and is thrown away, but it costs a round trip on first load of every page. The same request also isn't tied to the signed-in person, so in theory one account's badge count could be served from another's cached copy after switching accounts. Fix: only run it when someone is signed in, and tie it to that person.

2. **The priority hint on the first landing-page picture is being silently dropped** because of a casing mistake, so the browser doesn't know to load the main image first. Fix the casing so the big image loads sooner.

3. **Most pages share one generic browser tab title and description.** Pricing, sign in, and the "page not found" screen all show the site-wide default. Fix: give the main public pages their own title and description, and mark the "not found" page as not-for-search-engines.

4. **A stray leftover escape character in the text renderer's link pattern.** Harmless today but flagged as a mistake; I'll clean it up.

Two other flagged spots (`false &&` blocks in the note card and the pursuits page) are intentional "hidden for now" switches — I'll leave them, just noted so they don't look like bugs later.

## Speed improvements

1. **App icons are wildly oversized — the biggest win.** The 192-pixel app icon is 747 KB, the Apple touch icon 780 KB, and the 512 icon 685 KB. Worse, these get pre-downloaded and stored by the offline cache, so nearly 3 MB is pulled down on a visitor's first load for images that should total well under 100 KB. Fix: re-compress them at their true sizes.

2. **A 1.2 MB blog photo** on the practice-science article. Fix: convert and compress it (target under 150 KB) with no visible quality loss.

3. **Roughly 740 KB of unused leftover images** sitting in the project. Remove them.

4. **Stop the offline cache from hoarding large images**, so future oversized files can't silently bloat first load.

5. **Fonts:** five font families in twenty weights are loaded at startup. I'll check which are actually used by the themes and drop the unused weights from the startup path.

6. **Trim the startup bundle.** The always-loaded chunk is about 373 KB. I'll look for pieces that only matter after sign-in and move them behind the same lazy loading the rest of the app already uses, without changing behaviour.

## Backend security notes (no change unless you want it)

The database check flagged one thing worth acting on: **leaked-password protection is turned off** at sign-up, so people can pick passwords that are known to be compromised. I'd turn it on. The other 38 flags are the standard warnings about privileged helper functions, which this app uses deliberately for speed — those are expected and I'd leave them.

## Verification

After the changes: rebuild, re-measure the bundle and image sizes, re-run the browser sweep over the same pages to confirm zero console errors and no stray requests when logged out, and spot-check the landing page, pricing, and a signed-in dashboard render.

## Technical details

- `src/hooks/useNotifications.ts`: add `enabled: !!profile?.id` and user-scoped query keys (`['notifications', profile.id]`, `['notifications-unread-count', profile.id]`) to `useNotifications` and `useUnreadNotificationCount`; update invalidations at call sites. Same `enabled` gate for `useConversations` in `useMessages.ts`.
- `src/components/LandingFeatures.tsx:160`: `fetchPriority` → `fetchpriority` (React 18 does not map the camelCase form).
- `src/components/RichTextContent.tsx:256`: remove the unnecessary `\-` escape.
- SEO: apply the existing `usePageMeta` hook to `Pricing`, `Auth`, `Blog`, `Welcome`, `NotFound` (plus `noindex` on `NotFound`).
- Images: recompress `public/pwa-icon-192.png`, `public/pwa-icon-512.png`, `public/apple-touch-icon.png`, `public/app-icon-1024.png` and convert `src/assets/blog-science-practice.jpg`; delete `src/assets/ignore*.png` (no importers).
- `vite.config.ts`: drop `png` from the Workbox `globPatterns` precache list (icons still resolve at runtime); review `manualChunks` and route-level lazy boundaries for the 373 KB entry chunk.
- `src/main.tsx`: prune unused `@fontsource` weight imports after auditing `tailwind.config.ts` and theme usage.
- Auth: enable leaked-password protection via the auth configuration tool.
