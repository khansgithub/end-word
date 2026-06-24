# Task → Files

> For each task, the files you must read first (context), then the files you will likely edit. Load only what you need.

---

## Game Actions

**"I want to add a game action"** (new word rule, new game mechanic, new reducer action)
- *Read*: `src/shared/GameState.ts`, `src/shared/consts.ts`, `src/shared/types.ts`, `src/shared/utils.ts`
- *Edit*: `src/shared/GameState.ts` (action + reducer case), `src/app/server/game/roomService.ts` (server-side dispatch), `src/app/components/game/GameV2.tsx` (client-side dispatch)
- *If broadcast needed*: `src/app/server/game/roomBroadcast.ts`, `src/app/hooks/useRoomChannel.ts`, `src/app/api/mock-supabase/broadcast/route.ts` (ALLOWED_EVENTS)

**"I want to change how a word is submitted"**
- *Read*: `src/app/components/game/GameV2.tsx` (submit handler), `src/lib/client/game/word-submit.ts`, `src/lib/client/api/room.ts` (submitWordApi), `src/app/server/game/roomService.ts` (server submit logic)
- *Edit*: Depends on where the change lands — client validation (`word-submit.ts`), API contract (`room.ts` + server route), or server logic (`roomService.ts`)

**"I want to change game-over or win conditions"**
- *Read*: `src/shared/GameState.ts` (killPlayer, endGame, resolveGameStatus), `src/shared/gameStatus.ts` (status transitions), `src/shared/utils.ts` (shouldEndGameOnPlayerDeath, getAlivePlayerCount)
- *Edit*: `src/shared/GameState.ts`, `src/shared/gameStatus.ts`

---

## API Routes

**"I want to add an API route"**
- *Read*: `src/proxy.ts` (will this route need auth gating?), `src/lib/site-lock.ts` (server auth checks), `src/shared/site-lock.ts` (cookie constants), an existing similar route under `src/app/api/`
- *Edit*: New file under `src/app/api/`, add path to `isAuthPath()` or `isRoomInvitePath()` in `src/proxy.ts` as needed

**"I want to change how rooms are created/joined/left"**
- *Read*: `src/app/api/rooms/route.ts` (create), `src/app/api/rooms/join/route.ts`, `src/app/server/game/roomService.ts`, `src/app/server/game/roomDb.ts`, `src/app/hooks/useJoinRoom.ts`, `src/app/hooks/useLeaveRoom.ts`
- *Edit*: Route file + `roomService.ts` + possibly `roomDb.ts` if schema changes

---

## Timer

**"I want to fix a timer bug"**
- *Read*: `src/app/hooks/useCountdown.ts` (per-player stopwatch via `react-timer-hook`), `src/app/components/game/TimerBar.tsx` (visual bar), `src/shared/GameState.ts` (tickTimer action, killPlayerAndNextTurn), `src/app/hooks/useGameState.ts` (isTimerPaused, isInputDisabled), `src/app/components/game/GameV2.tsx` (handleTimerExpire, countdown wiring)
- *Edit*: Typically `useCountdown.ts`, `TimerBar.tsx`, or `GameV2.tsx`

**"The timer bar looks wrong"**
- *Read*: `src/app/components/game/TimerBar.tsx`, `src/app/components/game/game-v2.css` (`@keyframes shrink-width`), `src/app/components/game/PlayFocusPanel.tsx` (where it renders), `src/app/components/game/PlayerCard.tsx` (opponent timer)
- *Edit*: `TimerBar.tsx` or `game-v2.css`

---

## Auth & Site Lock

**"I want to change auth behavior"**
- *Read*: `src/proxy.ts` (all request gating), `src/lib/site-lock.ts` (server: isSiteLockEnabled, checkSiteAccess, siteAccessToken), `src/shared/site-lock.ts` (constants + roomAccessCookie), `src/app/api/site-auth/route.ts` (password validation + cookie set)
- *Edit*: `src/proxy.ts` for routing/gating, `src/lib/site-lock.ts` for auth logic, `src/app/site-login/page.tsx` for login UI

**"I want to change how room invites work"**
- *Read*: `src/proxy.ts` (isRoomInvitePath, extractRoomIdForAction), `src/shared/site-lock.ts` (roomAccessCookie), `src/app/api/rooms/join/route.ts` (join with invite bypass)
- *Edit*: `src/proxy.ts`, `src/app/api/rooms/join/route.ts`

---

## UI Components

**"I want to add a game component"**
- *Read*: A similar existing component in `src/app/components/game/`, `src/shared/types.ts` (GameState, Player), `src/app/components/game/GameV2.tsx` (how it wires children)
- *Edit*: New file in `src/app/components/game/`, possibly `GameV2.tsx` or `GameBoardLayout.tsx` for wiring

**"I want to change the game overlay (waiting/finished screen)"**
- *Read*: `src/app/components/game/GameOverlay.tsx`, `src/lib/client/ui/game-strings.ts` (localized strings)
- *Edit*: `GameOverlay.tsx`, `game-strings.ts`

**"I want to change the lobby"**
- *Read*: `src/app/lobby/page.tsx`, `src/lib/client/api/room.ts` (fetchLobbyRooms, createRoomApi), `src/lib/client/ui/game-strings.ts`
- *Edit*: `src/app/lobby/page.tsx`

---

## Broadcast & Realtime

**"I want to add a new broadcast event"**
- *Read*: `src/app/server/game/roomBroadcast.ts` (broadcast functions), `src/app/hooks/useRoomChannel.ts` (client reception, all 8 event handlers), `src/app/api/mock-supabase/broadcast/route.ts` (ALLOWED_EVENTS), an existing event type file (`src/shared/typingDraft.ts`, `src/shared/emote.ts`, `src/shared/timerSync.ts`)
- *Edit*: New shared type file + `roomBroadcast.ts` + `useRoomChannel.ts` + `ALLOWED_EVENTS` + any component that consumes the event

**"Supabase realtime isn't working"**
- *Read*: `src/app/hooks/useRoomChannel.ts`, `src/app/server/game/roomBroadcast.ts`, `src/app/components/SupabaseProvider.tsx`, `src/app/server/supabase/config.ts` (isMockSupabase)
- *Edit*: Usually `useRoomChannel.ts` or Supabase config

---

## Game State

**"I want to fix a game state bug"**
- *Read*: `src/shared/GameState.ts` (reducer, all actions), `src/shared/gameStatus.ts` (resolveGameStatus), `src/shared/types.ts` (GameState, Player, GameStateEmit), `src/shared/utils.ts` (turn helpers, alive counting)
- *Edit*: `src/shared/GameState.ts` almost always

**"Player joining/leaving is broken"**
- *Read*: `src/shared/GameState.ts` (addPlayer, removePlayer, markPlayerLeft, compactActivePlayers), `src/app/server/game/roomService.ts` (joinRoom, leaveRoom), `src/app/hooks/useJoinRoom.ts`, `src/app/hooks/useRoomChannel.ts` (presence handler)
- *Edit*: `GameState.ts` or `roomService.ts`

---

## Testing

**"I want to write an E2E test"**
- *Read*: `tests/e2e/room-flow.spec.ts` (DomEntry pattern, setupPages, helper functions), `tests/e2e/test-names.ts` (add your test name), `tests/e2e/custom-runner.ts` (how tests are launched)
- *Edit*: `room-flow.spec.ts` (or new file) + `test-names.ts`
- *Run*: `npm run test:playwright:custom <testName>`

**"I want to write a unit test"**
- *Read*: `tests/unit/setup.ts` (MSW, storage control), an existing test, `src/mocks/test-server.ts` (startMswTestServer), `src/mocks/handlers.ts` (mock API handlers)
- *Edit*: New file in `tests/unit/`
- *Crucial*: Imports before `process.env` assignments

---

## Dictionary

**"I want to change dictionary behavior"**
- *Read*: `src/app/server/dictionary/` (English/Korean modules), `api/index.py` (FastAPI entry), `dictionary/main.py` (app factory), `dictionary/build_trie.py` (trie compiler)
- *Edit*: Python files under `dictionary/` or TypeScript files under `src/app/server/dictionary/`

---

## Environment & Config

**"I want to add an environment variable"**
- *Read*: `src/app/env.d.ts` (ProcessEnv interface), `src/app/server/env.ts` (envGet, envGetOr), `.env`, `.env.prod`
- *Edit*: `env.d.ts` (add typed entry), `.env` / `.env.prod` (add value), `vercel.json` (if needed for deployment)

---

## Spectator Mode

**"I want to fix spectator behavior"**
- *Read*: `src/app/components/game/SpectatorView.tsx`, `src/app/api/rooms/[roomId]/spectate/route.ts`, `src/app/api/rooms/[roomId]/dissolve/route.ts`, `src/proxy.ts` (spectate path in extractRoomIdForAction)
- *Edit*: `SpectatorView.tsx` or spectate route

---

## Styling

**"I want to change game styling"**
- *Read*: `src/app/components/game/game-v2.css` (game tokens + components), `src/app/colours.css` (theme colors), `src/app/globals.css` (base styles), `tailwind.config.ts`
- *Edit*: `game-v2.css` or `colours.css`; use Tailwind utilities in components

---

## Emotes & Typing Draft

**"I want to change emotes or typing draft"**
- *Read*: `src/shared/emote.ts`, `src/app/components/game/EmotePicker.tsx`, `src/app/components/game/EmoteBanner.tsx` — or `src/shared/typingDraft.ts`, `src/app/hooks/useTypingDraft.ts`
- *Edit*: The shared type file + the component/hook + `useRoomChannel.ts` (handler)
