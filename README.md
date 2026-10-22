# Bebe Bucks 💚

A tiny PWA for two people to share one honest view of their money: what's due on
the **1st** and the **15th**, how each bill is split, **who owes whom**, and how
the savings goals are tracking — all from manual inputs, no bank linking.

## Run it

```bash
npm install
npm run dev
```

Open the printed URL (http://localhost:5190). It starts in **local demo mode** —
data lives in your browser — so you can explore everything immediately.

```bash
npm run build     # production build (PWA)
npm run preview   # preview the build
npm test          # run the finance unit tests
```

## How the money math works

Each bill has a **total**, a **payer** (you / partner / joint), a **due bucket**
(the 1st or 15th), and a **split** (50/50 or custom dollars that show the %).

- The payer fronts the full bill; everyone else owes the payer their share.
- Joint-paid bills don't create a debt between you, but still count as household cash.
- All cross-obligations net down to one **settle-up** number per date.
- A per-bill **"count full amount in household total"** toggle, turned off,
  makes a bill count only toward the shares (for one-way bills like a partner's
  insurance where you just owe a fixed amount).

Savings accounts project forward with monthly contributions and an assumed
annual return (compound), and estimate time-to-goal.

The calculations live in `src/lib/finance.ts` and are covered by
`src/lib/finance.test.ts`.

## Going from demo to shared (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql).
3. In **Authentication → Providers**, disable public sign-ups and add the two of
   you as users (email + password).
4. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY`.
5. Restart `npm run dev`. The app detects the keys and switches to shared cloud
   mode — both phones now see the same data.

> Note: the two-login auth gate is the next step on top of this schema; v1 ships
> the shared data layer + a per-device "who am I" switch.

## Deploy

Push to GitHub and import the repo into [Vercel](https://vercel.com) (framework
preset: Vite). Add the two `VITE_SUPABASE_*` env vars in the Vercel project
settings. You'll get a stable `https://` URL to add to each iPhone home screen.
