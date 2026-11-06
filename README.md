# Noteshare

**A music practice journal for musicians.** Capture ideas, track your practice, and share progress with people you trust: about ten times easier than a folder of voice memos.

Live at **[notesharemusic.com](https://notesharemusic.com)**. Noteshare is the first version; its sequel is [NoteshAIre](https://github.com/MatteoCaruso1/noteshaire), a desktop app that listens to your keyboard and fills your practice goals by itself.

## What it does

- **Practice notes**: quick text and audio notes on what you played, what clicked and what to work on next, organised by project and by what you're working toward.
- **Streaks and routines**: daily practice streaks, generated practice routines, and a monthly recap.
- **Share with trusted peers**: friends' journals, groups, comments and reactions, public profiles, and gigs.
- **Plans**: free tier plus Pro subscriptions and a lifetime option, sold through Stripe on the web and Apple in-app purchase on iOS.

## How it's built

| Part | Tech |
|---|---|
| Web app | React, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Mobile | Capacitor wrapper for iOS and Android |
| Backend | Supabase: Postgres with row-level security on every table, auth, storage, and ~20 Edge Functions |
| Payments | Stripe (checkout, customer portal, webhooks, entitlement reconciliation) and Apple purchase verification |
| Engagement | Scheduled functions for streak warnings, inactive-user nudges and email notifications |

Code tour: [`src/pages`](src/pages) holds the screens, [`src/components`](src/components) the UI, [`supabase/functions`](supabase/functions) the server-side logic, and [`supabase/migrations`](supabase/migrations) the full database history.

## Running it locally

```sh
npm install
npm run dev
```

The app talks to its own Supabase project. To run against your own, create a Supabase project, apply `supabase/migrations`, deploy `supabase/functions`, and put your project's URL and anon key in `.env` (the keys in this repo are public, browser-side keys; server secrets live in Supabase, not here).

Built with [Lovable](https://lovable.dev).
