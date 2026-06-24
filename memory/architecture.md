# Architecture

## Overview



## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React, Tailwind CSS |
| Backend | Next.js API routes |
| Database | Supabase (Postgres + Realtime) |
| Dictionary | Python (FastAPI, marisa-trie) on Vercel serverless |
| Testing | Playwright (E2E), Vitest (unit) |
| Logging | LogLayer (`loglayer` package) + `createLogger` wrapper + server buffer logger |
| Deployment | Vercel |

## Directory Structure

```
src/
  app/
    api/rooms/         — Room CRUD, join, submit, leave, spectate
    components/        — GameContainer, GameV2, TimerBar, PlayerCard, SpectatorView, etc.
    hooks/             — useTimer, useCountdown, useJoinRoom, useLeaveRoom, useRoomChannel, etc.
    lobby/             — Lobby page (create/join)
    room/              — Room page
    site-login/        — Site-wide password gateway
    server/            — Server utilities (env, logging)
    store/             — Client state store
    dictionary/        — Dictionary API client
  lib/
    client/            — Client-side logging, room API client
    supabase/          — Supabase client, real-time channels
    site-lock.ts       — Server-side site lock logic
  proxy.ts             — Route handler replacing Next.js middleware
  shared/
    site-lock.ts       — Shared site-lock constants (SITE_ACCESS_COOKIE, SITE_LOGIN_PATH)
    GameState.ts       — Game state reducer (single source of truth)
    consts.ts          — Constants (DEFAULT_TIMER_DURATION, MAX_PLAYERS, etc.)
    utils.ts           — isPlayerTurn, getCurrentTurnPlayer, etc.
    roomRow.ts         — Supabase room row types & helpers
    roomTypes.ts       — Room type definitions
    socketClient.ts    — Socket.IO client (legacy)
    socketEvents.ts    — Event type definitions
    timerSync.ts       — Timer synchronization utilities
    typingDraft.ts     — Typing draft state management
    usedWords.ts       — Used words tracking
    wordDefinition.ts  — Word definition types
dictionary/
  data/_src/           — Source XML files
  data/dict.marisa     — Compiled marisa-trie (runtime)
  data/metadata.jsonl  — Word metadata (runtime)
  build_trie.py        — Trie compiler
  load_trie.py         — Trie loader
  main.py              — FastAPI app factory
api/
  index.py             — Vercel serverless entry point (FastAPI)
tests/
  e2e/                 — Playwright tests (room-flow, prod-redirect)
  unit/                — Vitest unit tests
```

## Auth & Site Lock

Two-tier auth system:

1. **Site Lock** — Global password gate protecting the entire app
   - `src/lib/site-lock.ts` — Server-side: `checkSiteAccess(request)`, `isSiteLockEnabled()`
   - `src/shared/site-lock.ts` — Shared constants: `SITE_ACCESS_COOKIE`, `SITE_LOGIN_PATH`
   - Access granted via `SITE_ACCESS_COOKIE` set by `/api/site-auth`
   - Disabled when `MOCK_SUPABASE=true` or `NEXT_PUBLIC_MOCK_SUPABASE=true`
   - `SITE_PASSWORD` required in both `.env` and `.env.prod`

2. **Room Invite** — Per-room access cookie for invite links
   - `roomAccessCookie` set via join API for non-authenticated guests

3. **Proxy** (`src/proxy.ts`) — Replaces Next.js middleware as a route handler
   - Bypasses site lock for: room invite paths (`/room/:id`), join API, GET room info
   - Room action paths (submit, leave, timer-expiry, spectate, dissolve) validated via `extractRoomIdForAction()` — extracts roomId from path regex and checks room access cookie
   - Home page (`/`) bypassed for invite flow (client redirects here when playerName is empty)
   - **Non-auth users blocked from `/lobby`** — site lock redirects unauthenticated users away from lobby

**Known issue**: `router.push()` unreliable after login in production; fallback to `window.location.href` with 100ms timeout. `router.refresh()` can cause Vercel redirect race conditions.

## Game Engine & State

Centralized game state managed in `src/shared/GameState.ts` as a state machine/reducer.

**State flow**:

```
waiting → playing → finished → dissolved
```

**Key operations**:
- `resolveStatusAfterPlayerCountChange()` — Determines status transitions based on player count
- `killPlayerAndNextTurn()` — Atomic operation: kills player + advances turn in one dispatch
- `gameStateUpdateClient()` — Merges a `GameStateEmit` from the server into the client state, preserving `thisPlayer` and `timeRemaining`
- `tickTimer()` — Derives current player internally from `state.turn`/`state.connectedPlayers`

**Turn utilities** (`src/shared/utils.ts`):
- `isPlayerTurn(playerSeat)` — Whether the current browser player is the active turn player
- `getCurrentTurnPlayer(state)` — Returns the full player object for the active turn

**Data types**: `GameStateEmit` (server→client), `GameStateClient` (local client state), `Player`, `PlayersArray`

## Broadcast Pipeline

```
Server (roomService.ts)
  → persistRoomState() writes to Supabase Postgres
  → broadcastRoomGameState() sends via Supabase Realtime channel
    → useRoomChannel.ts receives via onUpdateRef
      → GameV2.tsx applyRemote callback
        → dispatch(gameStateUpdateClient) to reducer
          → GameState.ts merges into local state
```

**Persistence triggers**: join, word submit, player leave, room dissolve, room archive.

## Timer System

**Architecture**: Timer uses `react-timer-hook`'s `useStopwatch` via `useCountdown.ts`. The countdown starts on "playing" status, pauses via `isPaused` changes. Timer expiry is detected in `GameV2.tsx` when `remainingSeconds` hits 0, dispatching `killPlayerAndNextTurn` and calling `timerExpiryApi`.

**Components & hooks**:

| File | Role |
|------|------|
| `TimerBar.tsx` | Visual shrinking bar (CSS `@keyframes shrink-width` driven by `remainingSeconds`). Rendered in PlayFocusPanel (above input) and in PlayerCard compact mode (opponent timer). |
| `useCountdown.ts` | Per-player countdown timer via `react-timer-hook` `useStopwatch`; starts on "playing", pauses on `isPaused`, auto-restarts on turn change |

**Timer locations**:
- **PlayFocusPanel** (current player): `<TimerBar>` above the word input area
- **PlayerCard compact** (opponents): Small timer bar inside each opponent's card in PlayersRoster

**Sync flow**: Word-submit POST body includes current countdown → server updates `timeRemaining` for that player → broadcast to all clients via `broadcastRoomGameState()` → PlayerCard displays opponent timer.

**Pause**: Timer pauses when `isPaused` in `useGameState` is true (which gates on `isInputDisabled`, `isPlayerDead`, `isSubmitting`, and `!isGamePlaying`). Also pauses during invalid word submissions — already-used or too-short words trigger `setIsSubmitting(false)` without advancing the turn.

**Configuration**: `DEFAULT_TIMER_DURATION=60` in `src/shared/consts.ts`; adjustable via lobby slider → passed in room creation API → stored per-room → broadcast in game state.

## Emote System

Players can send animated emoji reactions during gameplay via the Supabase Realtime channel.

**Types** (`src/shared/emote.ts`):
- `EmotePayload` — `{ userId, seat, emoteId, timestamp }`
- `ActiveEmote` — `EmotePayload` with `id` and timestamp for animation tracking
- 8 emote options: hurry, panic, praise, praise2, sad, taunt, taunt2, thinking
- Rate limited: 1500ms throttle per user via `EMOTE_THROTTLE_MS`

**Components**:
| Component | Purpose |
|-----------|---------|
| `EmotePicker.tsx` | Pop-up selector anchored to a ref element, 8 emote buttons |
| `EmoteButton.tsx` | Trigger button that opens EmotePicker |
| `EmoteBanner.tsx` | framer-motion animated overlay (scale/rotate/opacity keyframes over 2.5s) on receiving an emote |

**Flow**: EmoteButton → EmotePicker → `EMOTE_EVENT` broadcast via channel → EmoteBanner animates on all clients.

## Typing Draft System

Real-time partial-word broadcast so spectators and opponents can see what the active player is typing.

**Types** (`src/shared/typingDraft.ts`):
- `TypingDraftPayload` — `{ userId, seat, draft, timestamp }`
- `TYPING_DRAFT_EVENT = "typingDraft"` — broadcast event constant

**Hook** (`useTypingDraft.ts`):
- Throttled at 80ms with 450ms auto-clear delay after typing stops
- Subscribes to `useInputBoxStore` (Zustand store inside `InputBox.tsx`) to read input value
- Only the active turn player broadcasts drafts
- Remote drafts are rendered in `PlayerCard`'s `typingDraft` prop (replaces last-word display)

## Timer Sync Protocol

Two-event protocol for synchronizing timer state across clients (`src/shared/timerSync.ts`):

- `TIMER_SYNC_EVENT = "timerSync"` — Host broadcasts current `remaining` seconds and `paused` state
- `TIMER_SYNC_REQUEST_EVENT = "timerSyncRequest"` — Any client can request a sync from the host

Handled in `useRoomChannel.ts`.

## Mock Supabase Infrastructure

Full in-process mock of Supabase for offline development. Enabled via `MOCK_SUPABASE=true` or `NEXT_PUBLIC_MOCK_SUPABASE=true`.

**Mock modules** (`src/app/server/supabase/mock/`):

| File | Purpose |
|------|---------|
| `store.ts` | `MockRoomStore` — in-memory Map for rooms |
| `realtimeHub.ts` | SSE-based realtime simulation (presence, broadcast, postgres_changes) |
| `channel.ts` | Mock `RealtimeChannel` implementation |
| `createClient.ts` | Mock Supabase browser client |
| `auth.ts` | Mock auth |
| `queryBuilder.ts` | Mock PostgREST query builder |

**Mock API routes** (`/api/mock-supabase/`):
- `broadcast/` — Allowlisted events: `typingDraft`, `gameStateUpdate`
- `presence/` — GET/POST/DELETE for mock presence state
- `realtime/` — SSE stream endpoint for mock realtime
- `reset/` — Clears in-memory mock room store

**Effects when enabled**: Site lock disabled (`isSiteLockEnabled()` returns false), real Supabase clients replaced with mocks.

## Legacy Code

- `src/shared/socketServer.ts.txt` / `socketHandlers.ts.txt` — Commented-out legacy Socket.IO server implementation (replaced by Supabase Realtime)
- `src/shared/socketClient.ts` / `socketEvents.ts` — Active files but likely dead code; game state broadcast now uses `useRoomChannel.ts` exclusively
- `STATE_SYNC_IMPLEMENTATION.md` — Describes old Socket.IO flow; now stale
- `src/app/components/old/` — Legacy component directory (old Game.tsx, InputSection, etc.)

## Rooms & Multiplayer

- Supabase real-time channels (one per room) for broadcast
- Presence tracking for join/leave detection
- Host can remove disconnected players on presence-leave (reads `gameStateRef`)
- `joinRoomApi()` called from both lobby (mutate) and GameContainer (fetch state) — idempotent by design
- `maxPlayers` tracked per room

**Room lifecycle**:
1. Host creates room (lobby → `createRoomApi`)
2. Players join (direct URL or lobby → `joinRoomApi`)
3. Host starts game (triggers `startGame()`)
4. Game plays (word submissions, turn changes, timer ticks)
5. Game ends (all-but-one dead or timer expiry)
6. Room cleaned up by `cleanup_stale_rooms()` SQL function (30 min idle or 0 players)

## Dictionary Service

- **Python** service running as Vercel serverless function (`api/index.py`)
- Uses **FastAPI** as the HTTP framework
- **marisa-trie** for efficient word lookup
- Runtime files: `dictionary/data/dict.marisa` + `dictionary/data/metadata.jsonl`
- Source/build files kept in `dictionary/data/_src/` (excluded from Vercel deploy via `.vercelignore`)
- Client integration: `src/app/dictionary/` in Next.js app
- **Server dictionary modules** (`src/app/server/dictionary/`): English WordNet, Korean API client, English-Korean translations, lemmatization, supplement exclusions
- **NIKL coverage scripts** (`dictionary/`): English-Korean dictionary coverage analysis using National Institute of Korean Language data

**Vercel deploy note**: `includeFiles` in `vercel.json` requires brace expansion (`{dict.marisa,metadata.jsonl}`), NOT comma-separated lists.

## Spectator Mode

- Players can join rooms as spectators (view-only)
- `SpectatorView.tsx` — Dedicated spectator UI component
- API route handles spectate join/leave
- Proxy allows spectator paths through site lock
- `spectatorsBroadcast.ts` — Broadcasts spectator-related updates

## UI Components

| Component | Purpose |
|-----------|---------|
| `GameContainer.tsx` | Thin orchestrator: wires `useJoinRoom`, `useLeaveRoom`, renders GameV2 or SpectatorView based on mode |
| `GameV2.tsx` | Active gameplay layout (input, timer, players, overlays) using `useRoomChannel`, `useGameState`, `useTypingDraft` |
| `GameOverlay.tsx` | Waiting/starting/finished modal overlays with player list, invite copy, start button, and back-to-lobby |
| `TimerBar.tsx` | Shrinking timer bar (CSS `@keyframes shrink-width` driven by `remainingSeconds`) |
| `PlayerCard.tsx` | Player info card with timer display and emote banner |
| `PlayersRoster.tsx` | List of player cards |
| `SpectatorView.tsx` | Spectator view (read-only with word feed, timer, player roster) |
| `InputSection.tsx` | Word input area |
| `ThemeToggle.tsx` | Light/dark theme toggle; positioned in AppNav (nav visible) or AppShell top-right (standalone screens) |
| `AppNav.tsx` | Top navigation bar with integrated ThemeToggle |
| `AppShell.tsx` | Shell wrapper (shows ThemeToggle in fixed position when nav hidden) |
| `PlayFocusPanel.tsx` | Focused play area with timer bar, status grid, and input |
| `BusyOverlay.tsx` | Translucent overlay with spinner during async operations |
| `GameBoardLayout.tsx` | Primary layout: game top bar + play focus panel + definitions panel |
| `GameTopBar.tsx` | Room name, leave button, game info |
| `DefinitionsPanel.tsx` | Word history with definitions |
| `PlayStatusGrid.tsx` | Match letter, round number, turn status display |
| `EmoteBanner.tsx` | Animated emoji reactions |

## Hooks

| File | Role |
|------|------|
| `useJoinRoom.ts` | Room join flow: fetches room state via GET `/api/rooms/:id`, calls `joinRoomApi()`, manages connection state (CONNECTED/CONNECTING/FAILED), redirects to name entry on site-locked or room-not-found |
| `useLeaveRoom.ts` | Cleanup on leave: calls `leaveRoomApi()` on tab close (`pagehide` event) and component unmount (with 100ms debounce for React Strict Mode remounts) |
| `useRoomChannel.ts` | Supabase Realtime subscription: receives game state broadcasts, typing drafts, word definitions, presence events (host auto-removes disconnected players via `gameStateRef`) |
| `useGameState.ts` | Derived game state: `isMyTurn`, `isInputDisabled`, `isTimerPaused`, `isSubmitting` computed from `GameStateClient`; used by GameV2 and SpectatorView |
| `useCountdown.ts` | Per-player countdown via `react-timer-hook` `useStopwatch`; starts on "playing" status, pauses when `isPaused` flag changes, resets on game status transitions |
| `useTypingDraft.ts` | Real-time typing draft sync between players via Supabase Realtime broadcast events |

## Logging

**Two logging systems** exist side by side:

### 1. `LogLayer` (hooks + room API client) — primary
Used in all hooks (`useRoomChannel`, `useCountdown`, `useGameState`, `useTypingDraft`, `useJoinRoom`, `useLeaveRoom`) and `src/lib/client/api/room.ts`:
```ts
import { LogLayer } from "loglayer";
import { ConsoleTransport } from "loglayer";
const logger = new LogLayer({
    transport: new ConsoleTransport({ logger: console, enabled, appendObjectData: true })
}).withPrefix("ModuleName");
logger.withMetadata({ data }).info("message");
```

### 2. `createLogger` (components) — secondary
Used in some game components (GameContainer, GameV2, InputSection, SpectatorView, TimerBar):
```ts
import { createLogger } from "@/lib/client/logging";
const logger = createLogger("ModuleName");
logger.info("message");
logger.debug("message", { data });
```

### Server: `logger` from `@/app/server/logging`
In-memory buffer logger (MAX_LOGS=1000) with file writing (MAX_LOG_FILE_BYTES=5MB), level filtering, and API-retrievable entries.

**Production gate**: All client logging disabled when `process.env.NODE_ENV === "production"` (via `enabled` export from `logging.ts`).

## Data Flow

### Joining a Room

```
User navigates to /room/:id
  → proxy.ts checks site lock and room invite cookie
  → GameContainer mounts, reads URL params
  → useJoinRoom hook:
      fetches room state via GET /api/rooms/:id
      calls joinRoomApi() to register player
      subscribes to Supabase real-time channel
  → If room is "waiting" and player is host:
      GameOverlay shows "Waiting for players" popup
      Host sees "Start Game" button when enough players
  → If room is "playing":
      GameV2 renders active gameplay
```

### Word Submission

```
Player types word → InputSection → submit
  → Client validates locally (word check)
  → POST /api/rooms/:id/submit with word + timeRemaining
  → server validates word via dictionary service
  → server updates game state (killPlayerAndNextTurn etc.)
  → persistRoomState() → Supabase Postgres
  → broadcastRoomGameState() → Supabase Realtime
  → all clients receive updated state via useRoomChannel
```

## Testing

| Layer | Framework | Config | Location |
|-------|-----------|--------|----------|
| E2E | Playwright | `playwright.config.ts`, `playwright.prod.config.ts` | `tests/e2e/` |
| Unit | Vitest | `vitest.config.ts` | `tests/unit/` |

**Key tests**:
- `room-flow.spec.ts` — 4-player full game flow (1250+ lines, 10+ test cases)
- `prod-redirect.spec.ts` — Production redirect after site login

**E2E infrastructure**:
- `custom-runner.ts` — Custom Playwright runner with per-test env overrides, `--ui` mode, JSON report output
- `test-names.ts` — Maps test names to descriptions
- `report.ts` — JSON reporter-compatible report builder
- `npm run test:playwright:custom <testName>` — Run specific named test

**Unit tests** (`tests/unit/`): Vitest with jsdom, MSW for API mocking.

**Dev utilities**:
- `MOCK_SUPABASE=true` — Run without real Supabase (broadcast handled in-process via mock realtime hub)
- `NEXT_PUBLIC_MOCK_SUPABASE=true` — Client-side flag that enables mock Supabase mode; checked alongside `MOCK_SUPABASE` in `isMockSupabase()`
- Site lock is disabled when mock Supabase is active (`isSiteLockEnabled()` returns false)
- `gameStateUpdate` event allowed in mock broadcast route for full state sync
- Mock dictionary data for offline testing
- Custom test runner at `test_record.ts`

**Gotcha**: In `tests/unit/setup.ts`, `import` statements must precede `process.env` assignments due to ESM hoisting.

## Key Decisions & Gotchas

See [`decisions.md`](decisions.md) for the full decision log and rationale behind architectural choices.

See [`agent-notes.md#common-gotchas`](agent-notes.md) for the complete list of common gotchas when working on this codebase.
