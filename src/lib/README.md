# `src/lib` layout

Shared library root for **client** code and the browser Supabase entry.

| Path | Runs in | Purpose |
|------|---------|---------|
| `client/` | Browser | Fetch wrappers, UI strings, client-side game/input helpers |
| `supabase/client.ts` | Browser | `"use client"` Supabase browser client |

Server-only modules live under [`src/app/server`](../app/server/README.md).

Legacy Socket.IO game server (pre–room API) lives in `src/legacy/socket/` — use `npm run dev:legacy` only if you need it.
