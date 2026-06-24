# _INDEX

> **~2K token entry point for AI agents.** Read this first, then load other files on demand.

---

## Project: End Word

Korean 끝말잇기 & English word-chain multiplayer game.

**Stack**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + daisyUI
**Backend**: Next.js API routes + Supabase (Postgres, Auth, Realtime)
**Dictionary**: Python FastAPI + marisa-trie on Vercel serverless
**State**: Zustand (userStore, InputBox store) + React useReducer (game state)
**Realtime**: Supabase Realtime channels (one per room)
**Testing**: Playwright (E2E) + Vitest (unit) + MSW (API mocking)
**Logging**: LogLayer (`loglayer` package) in hooks; `createLogger()` from `@/lib/client/logging` in components
**Deploy**: Vercel

---

## 3 Critical Conventions

1. **Module boundaries are strict**:
   - `src/shared/` — Pure logic. No React, no Node imports. GameState reducer, types, utils, consts.
   - `src/lib/` — Server-side utilities (site-lock, Supabase config).
   - `src/lib/client/` — Client-only: hooks, API clients, UI helpers.
   - `src/app/components/game/` — All game React components (28 files).
   - Never import `src/lib/server/*` into a component — it will bundle server secrets.

2. **Logging: two systems, know which one**:
   - **Hooks + room API client**: `new LogLayer({ transport: new ConsoleTransport({...}) }).withPrefix("Name")` → `logger.withMetadata({...}).info("msg")`
   - **Components**: `const logger = createLogger("ModuleName")` from `@/lib/client/logging` → `logger.info("msg")`
   - **Server**: `logger` from `@/app/server/logging` (in-memory buffer, 1000 entries, file writing)
   - All disabled when `NODE_ENV === "production"`.

3. **Auth is two-tier** (`src/proxy.ts` handles all gating):
   - **Site lock**: Global password → `end-word-site-access` cookie → `/site-login` page.
   - **Room invite bypass**: `/room/:id`, join API, GET room info bypass site lock for "playing" rooms.
   - **Room access cookie**: Per-room cookie (`end-word-room-${roomId}`) validated on action endpoints.
   - Non-auth users are blocked from `/lobby`.

---

## 5 Most Common Gotchas

1. **Stale closures in hooks** (`useCountdown`, `useRoomChannel`): Callbacks must use refs (`useRef`) to read latest state — never capture state values at mount time. The `gameStateRef` pattern (MutableRefObject) is the standard fix.

2. **`router.push()` silent failure on Vercel**: Production redirects need a 100ms timeout fallback to `window.location.href`. `router.refresh()` causes race conditions — removed from `site-login/page.tsx`.

3. **ESM import hoisting**: `import` declarations are hoisted above `process.env` assignments. In `tests/unit/setup.ts`, all imports must come before any `process.env` lines.

4. **Vercel `includeFiles` syntax**: Use brace expansion `{dict.marisa,metadata.jsonl}`, NOT commas. Commas are silently ignored.

5. **New broadcast events need gating**: If you add a new realtime broadcast event, you MUST add it to `ALLOWED_EVENTS` in `src/app/api/mock-supabase/broadcast/route.ts` and handle it in `useRoomChannel.ts`.

---

## Which File to Load Next

| Your task | Read this |
|-----------|-----------|
| **Understand the project's purpose and philosophy** | `spirit.md` |
| **See all user flows (explored and unexplored)** | `use-cases.md` |
| Understand the full architecture | `architecture.md` |
| Fix a bug / work with hooks / add components | `agent-notes.md` |
| Understand why something was built a certain way | `decisions.md` |
| Find a specific term or component | `glossary.md` |
| See feature list / check what's implemented | `features.md` |
| See known issues and workarounds | `tech-debt.md` |
| See current branch/focus/blockers | `current-work.md` |
| **Check hard constraints before any code change** | `rules.md` |
| **Find which files to touch for a given task** | `task-to-files.md` |
| **After modifying memory files, verify them** | `audit.md` |

---

## Quick-Ref: Key Files

| Concern | File |
|---------|------|
| Auth gate (every request) | `src/proxy.ts` |
| Game state reducer | `src/shared/GameState.ts` |
| Status transitions | `src/shared/gameStatus.ts` |
| Main gameplay UI | `src/app/components/game/GameV2.tsx` |
| Join flow orchestration | `src/app/hooks/useJoinRoom.ts` |
| Supabase realtime | `src/app/hooks/useRoomChannel.ts` |
| Timer tick + death | `src/app/hooks/useCountdown.ts` |
| Server game logic | `src/app/server/game/roomService.ts` |
| DB reads/writes | `src/app/server/game/roomDb.ts` |
| Broadcast to clients | `src/app/server/game/roomBroadcast.ts` |
| API client (browser→server) | `src/lib/client/api/room.ts` |
| Site lock (server) | `src/lib/site-lock.ts` |
| Site lock (shared constants) | `src/shared/site-lock.ts` |
| Typed env access | `src/app/server/env.ts` |
| Test infrastructure (E2E) | `tests/e2e/room-flow.spec.ts` |
