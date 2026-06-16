# ReViet — TH ↔ VN Second-hand Shop

A cross-border (Thailand ↔ Vietnam) second-hand marketplace, built as a
self-contained React app (React 18 + Babel standalone, loaded from CDN —
no build step) backed by a free [Supabase](https://supabase.com) project
(Postgres + Auth + auto-generated API).

## Features

- **Auth** — email/password sign up as a Seller (TH) or Buyer (VN); sign in / sign out.
- **Admin** — overview dashboard, Vietnam demand board, product matching (pair
  Thai listings with VN demand), finance ledger (receive VND → convert to THB → pay out).
- **Seller (TH)** — list second-hand items (with live VND price preview), seller reward points.
- **Buyer (VN)** — shop with category filters, cart + checkout (earns points), redeem rewards.
- **Tracking** — 7-step origin→destination status timeline per order.
- **3 languages** — Thai / Vietnamese / English, switchable everywhere.

FX is fixed at **1 THB = 730 VND**. Product images are striped SVG placeholders.

## Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql) — this creates all
   tables, RLS policies, RPC functions, and seed data.
3. In **Settings → API**, copy the **Project URL** and **anon public** key into
   [`js/supabase-client.jsx`](js/supabase-client.jsx) (`SUPABASE_URL` / `SUPABASE_ANON_KEY`).

The anon key is meant to be public — **Row Level Security (RLS)**, defined in
`supabase/schema.sql`, is what actually protects the data.

## Run it locally

The app must be served over HTTP (Babel fetches the `js/*.jsx` files), so opening the
HTML file directly will not work. From this folder, run the included PowerShell server:

```powershell
.\serve.ps1
```

Then open <http://localhost:8000/> (an internet connection is required for the
React/Babel/Supabase CDN scripts).

Sign up once through the app, then in the Supabase **Table Editor** open `profiles`
and set that row's `role` to `admin` to unlock the admin views (Matching, Finance, etc.).

## Deploy

See [`DEPLOY.md`](DEPLOY.md) for step-by-step instructions to put this online for free
with GitHub + Vercel/Cloudflare Pages.

## Files

- `index.html` — entry point: theme tokens, all CSS, script imports.
- `supabase/schema.sql` — database schema, RLS policies, RPCs, and seed data.
- `js/data.jsx` — i18n helper (`t`), currency formatters, category labels, tracking stages.
- `js/supabase-client.jsx` — Supabase client setup (project URL + anon key).
- `js/components.jsx` — shared UI (Card, Button, StatCard, Timeline, PointsRing, …).
- `js/views_auth.jsx` — sign in / sign up screen.
- `js/views_admin.jsx` / `views_seller.jsx` / `views_buyer.jsx` / `views_tracking.jsx` — role views.
- `js/app.jsx` — app shell: auth state, data loading, role tabs, sidebar nav, language switcher.
