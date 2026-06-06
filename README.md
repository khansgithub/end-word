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
# Unit tests (runs Vitest once and exits)
npm run test:unit

# End-to-end tests (default: Playwright + custom E2E runner)
npm run test:playwright

# Build E2E test dashboard (generates HTML dashboard for test results)
npm run test:dashboard

# Run all tests (unit + E2E)
npm run test:all

# Open Playwright UI for E2E tests (interactive test runner)
npm run test:playwright:ui

# Run Playwright E2E tests matching a pattern (use --grep for test name)
npm run test:playwright:grep

# Run Playwright E2E tests with UI and filtering (--grep + --ui)
npm run test:playwright:grep:ui

# Run custom Playwright E2E script (custom-runner.ts)
npm run test:playwright:custom <name of test>

# Run custom Playwright E2E script with UI (--ui)
npm run test:playwright:custom:ui <name of test>

# Watch unit tests (Vitest in watch mode)
npm run test:watch

```

## Legacy

`npm run dev:legacy` runs the old Express + Socket.IO server on port 4000 (not used for Vercel).
