# Moving Noteshare off Lovable (started 2026-11-06)

Why: Lovable paused the old backend (Supabase project `zxnygdxzvhkqodazhqcb`) for lack of credits; its hostname
no longer resolves, so sign-in and all data are down. Matteo will not pay Lovable.

## Done
- New Supabase project **noteshare** (`gdubmgehkwvdgwqvoldu`) in MatteoCaruso1's Org (free plan; 100 Daily Games is
  the other active project, distribution-machine is paused and does not use a slot).
- All 117 migrations applied through the SQL editor (fetched from GitHub main, includes
  `20261106220000_security_fixes.sql`). Skipped one data line: the developer premium override for old user id
  72d4f978-... (does not exist here). Result: 39 tables, RLS on all 39, buckets practice-media and notes-media private.
- Branch `move-off-lovable`: AI features hidden on Profile (`AI_FEATURES_ENABLED = false`).

## Done 2026-11-06 evening
- `.env` on this branch points at the new project (anon key). Built and uploaded with
  `wrangler pages deploy dist --project-name noteshare --branch main` → **https://noteshare-7ww.pages.dev** (classic Pages
  project, created with `--force` because Vite 5 can't use the Workers delegation).
- Edge functions deployed via the dashboard editor: get-signed-url, check-subscription, commit-ftue.
- Auth: Site URL = https://noteshare-7ww.pages.dev; redirect URLs: pages.dev/**, notesharemusic.com/**, www.notesharemusic.com/**.
  "Confirm email" is still ON (turning it off was blocked by the safety check; Matteo's call).
- Cloudflare zone notesharemusic.com added (Free plan), scanned records kept (A → Lovable, 3 CNAME, 2 IONOS MX, SPF TXT).
  Cloudflare nameservers: chip.ns.cloudflare.com, dell.ns.cloudflare.com. Matteo changes them at IONOS.

## After the nameservers are active
- Pages → noteshare → Custom domains → add notesharemusic.com and www.notesharemusic.com (Cloudflare replaces the
  old A record pointing at Lovable). Then set Supabase Site URL to https://notesharemusic.com.

## Original plan, in order
1. `.env` on this branch: set `VITE_SUPABASE_URL=https://gdubmgehkwvdgwqvoldu.supabase.co`,
   `VITE_SUPABASE_PROJECT_ID=gdubmgehkwvdgwqvoldu`, and the **anon** key from
   Supabase → Settings → API Keys → Legacy (public browser key; Matteo copies it, the browser tool blocks reading JWTs).
2. Edge functions the app needs without Stripe/AI: get-signed-url, check-subscription (returns Pro from
   premium_overrides before touching Stripe), commit-ftue, send-password-reset (needs RESEND_API_KEY),
   send-feedback-email (RESEND_API_KEY). JWT enforcement off for get-signed-url and check-subscription (see
   supabase/config.toml). Deploy via dashboard → Edge Functions, or `supabase functions deploy` after `supabase login`.
3. Supabase Auth → URL configuration: Site URL https://notesharemusic.com, redirect URLs https://notesharemusic.com/**
   and the Cloudflare Pages URL. Google sign-in used Lovable's broker (`/~oauth`) and will not work: email/password only
   until a Google OAuth client is set up.
4. Cloudflare Pages: new project from GitHub `MatteoCaruso1/noteshare`, branch `move-off-lovable`, build `npm run build`,
   output `dist`, env vars from step 1. Check the *.pages.dev URL works (sign up, note, upload audio).
5. Domain: notesharemusic.com DNS is at IONOS (ns*.ui-dns.*). Add it as a Pages custom domain, then change the
   records at IONOS (Matteo signs in). Currently points at Lovable (185.158.133.1).
6. Old data: when Lovable's free Cloud grant refreshes (Dec 1 00:00 UTC), More → Database → Wake up, then export the
   database (and download storage files) the same day; pg_restore data + auth users into the new project; upload files.
   Not guaranteed: the grant may not cover it. Never click "Remove database" in Lovable.
7. Merge `move-off-lovable` into main once live.
