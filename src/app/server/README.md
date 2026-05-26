# `src/app/server` layout

Server-only code colocated under the App Router tree (no `page.tsx` / `route.ts` here — not a public route).

| Path | Purpose |
|------|---------|
| `env.ts`, `logging.ts` | Env access, logging |
| `auth/` | Session helpers |
| `game/` | Room DB, service, broadcast |
| `dictionary/` | Word validation (English WordNet, Korean HTTP API) |
| `supabase/` | Admin, SSR, mock, config |

Browser Supabase entry stays at `src/lib/supabase/client.ts` (`"use client"`).

Client UI and fetch helpers: `src/lib/client/`.

Legacy Socket.IO: `src/legacy/socket/`.
