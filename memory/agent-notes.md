# Agent Notes

Important context, conventions, and observations for AI agents working on this project.

## Conventions

### Logging
- **Hooks + room API client**: Use `LogLayer` + `ConsoleTransport` from `loglayer` npm package. Pattern: `new LogLayer({ transport: new ConsoleTransport({...}) }).withPrefix("Name")`, then `logger.withMetadata({...}).info/debug()`.
- **Components**: Use `createLogger("ModuleName")` from `@/lib/client/logging`. Pattern: `logger.info("msg")`, `logger.debug("msg", { data })`.
- **Server**: `logger` from `@/app/server/logging` (in-memory buffer, MAX_LOGS=1000, file writing, API retrievable).
- **Security**: Never log passwords, tokens, or secrets. Log password *length* instead of the password itself.
- **Production gate**: All client logging disabled via `enabled` export when `NODE_ENV === "production"`.

### Module Organization
- `src/lib/client/` — Client-only modules (React hooks, UI utilities, API clients)
- `src/lib/` — Server-only or shared library modules
- `src/shared/` — Pure shared modules (no React, no Node-specific imports)
- `src/app/server/` — Server utilities (auth, env, Supabase admin, game services)
- `src/app/components/` — React components (both server and client, marked with `"use client"` where needed)

### Import Paths
- `@/` resolves to `src/`
- `@tests/` resolves to `tests/`
- `@scripts/` resolves to `scripts/`
- `@root/` resolves to project root

### Testing
- **Unit tests**: Vitest with jsdom at `tests/unit/`, setup file: `tests/unit/setup.ts`
- **E2E tests**: Playwright at `tests/e2e/`. Main test file: `room-flow.spec.ts` (1250+ lines).
  - `npm run test:playwright:prod` — Production redirect test
  - `npm run test:playwright:custom <testName>` — Run specific E2E test by name
  - Test names defined in `tests/e2e/test-names.ts`
- **Important**: In `tests/unit/setup.ts`, all `import` statements MUST come before `process.env` assignments due to ESM import hoisting
- `MOCK_SUPABASE=true` environment variable enables mock Supabase for offline testing
- E2E tests use `DomEntry` type with pre-configured locators; update `setupPages()` when UI changes

### Auth Pattern
- Two HTTP-only cookies: `end-word-site-access` (site-wide password) and per-room access cookie
- Site lock check: `checkSiteAccess(request)` in `src/lib/site-lock.ts`
- Room invite bypass: certain paths pass through site lock if the target room is in "playing" status
- `buildLoginUrl()` in `src/lib/client/ui/return-to.ts` builds `/?returnTo=<path>` URL with open-redirect guard

### Environment Variables
- `.env` — Development (loaded when `NODE_ENV=development`)
- `.env.prod` — Production (loaded when `NODE_ENV=production`)
- `src/app/server/env.ts` — Wrapper around `dotenv` for typed env access via `envGet()`, `envGetOr()`, `envHas()`
- `SITE_PASSWORD` — Required for site lock; set in both `.env` and Vercel environment variables for production

### Git Ignore
- `.gitignore` uses `.*/` to exclude all dot-prefixed directories, with `!.yarn/` exception

## Architecture Notes

### Site Lock Flow
1. `proxy.ts` intercepts every request
2. If `isSiteLockEnabled()` returns false → pass through
3. If path is auth path (`/site-login`, `/api/site-auth`, `/api/dictionary/*`) → pass through
4. If path is room invite path and room is "playing" → pass through
5. Otherwise → check `SITE_ACCESS_COOKIE`; redirect to `/site-login` if invalid

### Game State Management
- `src/shared/GameState.ts` is the single source of truth for game state
- State machine: `waiting → playing → finished → dissolved`
- All mutations happen on server; client receives `GameStateEmit` broadcasts
- Client merges server state into local `GameStateClient` via `gameStateUpdateClient()`

## Common Gotchas

1. **ESM import hoisting**: Static `import` declarations are hoisted above `process.env` assignments. Always put imports before env setup in test files.
2. **`router.push()` unreliable on Vercel**: Use `window.location.href` with 100ms timeout as fallback for production redirects.
3. **`router.refresh()` causes race conditions**: Calling `router.replace()` then `router.refresh()` can cause redirect failures on Vercel. Prefer just `router.replace()`.
4. **Vercel `includeFiles` syntax**: Must use brace expansion `{a,b}` NOT comma-separated `a,b` in `vercel.json`.
5. **Supabase `IS` operator**: `IS` is for NULL comparison only; use `=` for value comparison.
6. **`resolveStatusAfterPlayerCountChange()` bug**: This function incorrectly set status to "playing" on first join. Verify status logic when debugging player count transitions.
7. **Broadcast after persist**: Join room operations must broadcast state after persisting, otherwise the host never sees the Start button.
8. **Dictionary data**: Runtime files are `dict.marisa` and `metadata.jsonl` in `dictionary/data/`. Source XMLs are in `dictionary/data/_src/` and excluded from Vercel deploy.
9. **Stale closures in hooks (CRITICAL)**: React hooks (`useCountdown`, `useRoomChannel`) receive callbacks at mount time. If those callbacks capture state values (not refs), they become stale after re-renders. Always use `useRef` for values consumed inside callbacks — specifically:
   - Timer pause check: `isPaused` is computed in `useGameState` and passed to `useCountdown`; the countdown's `useEffect` reacts to `isPaused` changes via dependency array, not refs
   - `gameStateRef` pattern: Pass `MutableRefObject<GameStateClient>` into `useRoomChannel` so presence handlers always read latest state
   - Timer expiry: `handleTimerExpire` in `GameV2.tsx` reads from `gameStateRef` and `countdownRef` to avoid stale seat calculations
10. **Mock Supabase client flag**: `NEXT_PUBLIC_MOCK_SUPABASE=true` required for client-side mock detection (alongside server-side `MOCK_SUPABASE=true`). Site lock disabled when mock mode is active. `gameStateUpdate` event must be in the allowed events list for mock broadcast.
11. **Host presence-leave handling**: Host's `useRoomChannel` must check presence-leave events against current game state (via `gameStateRef`) before removing a player, to avoid incorrectly removing players on transient presence flapping.
12. **InputBox uses an internal Zustand store** (`useInputStore`) for input/highlight/composing/error state. Module-level functions `focusInputBox()`, `getInputValue()`, `resetInput()`, `setInputError()` access this store via `useInputStore.getState()`. Must import from `@/app/components/game/InputBox`.
13. **BoolMap styling pattern** (`src/lib/client/ui/player-util.ts`): Binary decision tree that maps boolean conditions (turn, isCurrentPlayer, hasPlayer) to CSS values. Used for PlayerCard styling — don't edit without understanding the decision tree.
14. **Hangul Input FSM** (`src/app/fsm.txt` + `src/lib/client/game/input-validation.ts`): Finite state machine for Korean syllable composition (S0 → S_ㄱ → S_가 → S_강 → S_값). `validateInput()` returns CLEAR/BLOCK/CONTINUE actions. Backed by `hangul-decomposer.ts`.
15. **Legacy Socket.IO code**: `socketServer.ts.txt` / `socketHandlers.ts.txt` are dead code (commented out). `socketClient.ts` / `socketEvents.ts` may also be dead — game state broadcast now exclusively uses `useRoomChannel.ts` + Supabase Realtime. `STATE_SYNC_IMPLEMENTATION.md` is stale.
16. **Environment variables not in env.d.ts**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase project), `SITE_PASSWORD` (site lock), `NODE_ENV` — all required for production but not typed.
17. **Per-room access cookie**: `roomAccessCookie(roomId)` from `@/shared/site-lock` generates `end-word-room-${roomId}` cookie. Set on join, cleared on leave.
18. **`gameStatus.ts` state machine**: `resolveGameStatus()` determines status transitions (waiting→playing→finished→dissolved) based on player counts, health, and game state. Separate from the GameState reducer.
