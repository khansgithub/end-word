# End Word

Multiplayer word-chain game: Korean **끝말잇기** and English (last-letter chains). Multiple concurrent matches use **rooms** backed by **Supabase Postgres** with **Realtime** broadcasts. Deployable on **Vercel** (Next.js App Router only — no custom Socket.IO server).

## Stack

- **Next.js 16** — UI, Route Handlers, middleware (Supabase session)
- **Supabase** — anonymous auth, `rooms` table, Realtime `postgres_changes`
- **English dictionary** — `an-array-of-english-words` + `wink-lexicon` (offline, in-process)
- **Korean dictionary** — optional Python FastAPI service in `dictionary/` (`DICTIONARY_URL`)

## Features

- Lobby with public room list; create public/private rooms
- Join via `/room/[roomId]` or 6-character invite code
- Host starts the game (1–4 players, solo practice allowed)
- Bilingual: Korean or English per room
- Rooms archived after a match ends

## Environment

Copy `.env.example` to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DICTIONARY_URL=http://localhost:8000   # Korean only
```

Enable **anonymous sign-ins** in the Supabase dashboard (Authentication → Providers).

## Development

```bash
npm install
npm run dev          # http://localhost:3000
```

Optional Korean dictionary:

```bash
npm run install-python-venv
cd dictionary && .venv/bin/python main.py   # or Scripts on Windows
```

## Database

Linked project: `end-word` (`wvvpheefkzildcguzzfn`). Migrations live in `supabase/migrations/`.

```bash
supabase link --project-ref wvvpheefkzildcguzzfn
supabase db query --linked -f supabase/migrations/<file>.sql
```

## Tests

```bash
npm run test:unit
npm run test:playwright
```

**Playwright:** `tests/e2e/user-stories.spec.ts` drives the Next.js app (lobby → room → start → submit). It needs a running dev server (the config starts `npm run dev`) and valid Supabase env (anonymous auth + service role) so `/api/rooms` succeeds; otherwise those tests are skipped. After `npm install`, run `npx playwright install` once so browsers are available.

Run only the Next app stories: `npm run test:playwright:next`.

Legacy Socket.IO coverage lives in `tests/e2e/room-flow.spec.ts` (expects `npm run dev:legacy` on port **4000**). To include it in a Playwright run: `RUN_ROOM_FLOW=1 npx playwright test`. The `tests/e2e/custom-runner.ts` flow sets this automatically when it executes room-flow tests.

## Legacy

`npm run dev:legacy` runs the old Express + Socket.IO server on port 4000 (not used for Vercel).
