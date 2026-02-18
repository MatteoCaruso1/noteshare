

# SEO Improvements for Noteshare

## Problem
1. Google shows the Lovable logo as favicon instead of the Noteshare icon
2. "noteshare music" search doesn't surface the site well
3. Several SEO fundamentals are missing

## Changes

### 1. Replace Favicon with Noteshare Icon
The current `favicon.png` and `favicon.ico` are Lovable defaults. We'll replace them with your actual Noteshare icon (the same one used for PWA icons) so Google and browsers show the correct brand.

- Replace `public/favicon.png` with the Noteshare logo
- Replace `public/favicon.ico` with the Noteshare logo
- This will also fix the browser tab icon

### 2. Add a Sitemap
Create a `public/sitemap.xml` that tells Google about your pages. This helps with discovery and indexing.

### 3. Update robots.txt
Add a reference to the sitemap so crawlers can find it automatically.

### 4. Add Structured Data (JSON-LD)
Add a `WebApplication` schema to `index.html` so Google understands what Noteshare is — a music practice tool. This can improve how your site appears in search results.

### 5. Fix Canonical URL
The canonical URL currently points to `https://noteshare.app`. If that domain isn't set up yet, this actually hurts SEO because Google sees a mismatch. We should either:
- Point it to `https://jazz-scene-alive.lovable.app` (current live URL), or
- Keep it as `noteshare.app` if you plan to connect that custom domain soon

### 6. Improve Meta Description
Rework the meta description to be more keyword-rich for "noteshare music" searches while staying natural.

## What This Won't Fix
- **Google indexing takes time** — even after these changes, it can take days to weeks for Google to re-crawl and update results
- **SPA rendering** — since this is a client-side React app, Google's crawler may not fully render all content. For deeper SEO (like per-page meta tags), a server-side rendering solution would be needed, which is outside Lovable's scope
- **Domain authority** — a new site needs backlinks and time to rank well

## Technical Details

### Files to create
- `public/sitemap.xml` — lists main routes (/, /auth, /welcome)

### Files to modify
- `public/favicon.png` — replace with Noteshare icon (we'll use the existing `pwa-icon-512.png` resized, or you can upload a dedicated favicon)
- `public/robots.txt` — add `Sitemap:` directive
- `index.html` — add JSON-LD structured data, update meta description with better keywords, fix OG image URLs

### No impact on
- Existing app functionality
- PWA behavior
- Any components or routing

