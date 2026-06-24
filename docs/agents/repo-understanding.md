# Repo Understanding: end-word

A real-time multiplayer word game built with Next.js, Supabase, and TypeScript. Players take turns forming words from a given starting letter — last one standing wins.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router) |
| Language | TypeScript (strict, full-stack) |
| Database | Supabase (Postgres, `rooms` table as single source of truth) |
| Realtime | Supabase Realtime channels (no direct WebSocket/Socket.IO in current architecture) |
| State Management | Redux-style reducer (`useReducer` + pure functions in `GameState.ts`) |
| Styling | Tailwind CSS |
| Testing | Vitest (unit), Playwright (E2E) |
| Dictionary | Custom dictionary API (English + Korean) |
| Auth | Cookie-based two-tier access control (site lock + per-room invite) |

---

## Project Structure

```
src/
├── shared/               # Client-server shared code (zero server-only deps)
│   ├── types.ts          # Central type definitions (Player, GameState, Spectator, etc.)
│   ├── GameState.ts      # Reducer — all game state mutations as pure functions
│   ├── consts.ts         # App-wide constants
│   ├── utils.ts          # Shared utilities (mutex, player helpers, match letter builders)
│   ├── roomTypes.ts      # RoomRow DB schema type
│   ├── roomRow.ts        # DB row → in-memory GameStateServer conversion
│   ├── site-lock.ts      # Cookie name constants
│   ├── errors.ts         # Custom error classes
│   ├── guards.ts         # Type guards
│   ├── usedWords.ts      # Used words set management
│   ├── spectatorsBroadcast.ts  # SPECTATORS_UPDATE_EVENT constant (shared-safe)
│   ├── socketEvents.ts   # Socket event name constants
│   └── gameStatus.ts     # Game status utilities
├── app/
│   ├── components/game/  # React UI components
│   │   ├── GameContainer.tsx      # Mode-based flow (join/spectate/dissolved)
│   │   ├── SpectatorView.tsx      # Read-only spectator UI
│   │   ├── GameBoardLayout.tsx    # Board layout (topBar, playFocus, wordHistory, playersBar)
│   │   └── ...                    # Input, history, player roster, etc.
│   ├── server/game/
│   │   ├── roomService.ts         # Business logic (create, join, start, submit, leave, spectate)
│   │   ├── roomDb.ts              # Database access layer (CRUD, persist, archive, spectate)
│   │   ├── roomBroadcast.ts       # Realtime event broadcasting
│   │   └── dictionary/            # Word validation (English + Korean)
│   ├── hooks/
│   │   └── useRoomChannel.ts      # Supabase Realtime channel hook
│   └── api/rooms/[roomId]/
│       ├── submit/route.ts
│       ├── leave/route.ts
│       ├── timer-expiry/route.ts
│       └── spectate/route.ts      # POST (join as spectator), DELETE (leave spectate)
├── lib/
│   ├── client/ui/game-strings.ts   # UI string constants
│   └── site-lock.ts               # Server-side access control helpers
├── proxy.ts                        # Next.js middleware (access control enforcement)
└── (legacy socket.io server dir)
```

---

## Key Architectural Patterns

### 1. Game State as a Reducer

All game logic lives in `shared/GameState.ts` as ~33 pure reducer functions. No mutation happens outside this file. The `gameStateReducer` function dispatches named actions. The same reducer runs on both client (via `useReducer`) and server (applied before persisting).

### 2. Supabase Row as Single Source of Truth

Every room is a single row in the `rooms` table. The `players` array, `player_user_map`, `used_words`, `spectators`, and all game state fields are JSONB columns in that row. The server reads the row, applies reducers, writes back — no separate tables for game state.

### 3. Promise-Based Mutex

Socket events arriving concurrently could corrupt state. `createSocketMutex()` in `shared/utils.ts` chains async operations so only one mutation runs at a time per room.

### 4. Two-Tier Access Control

- **Global site lock**: A password cookie (`end-word-site-access`) controls access to the entire app.
- **Per-room invite cookie**: Unauthenticated users who join via invite link get a room-specific cookie (`end-word-room-{roomId}`) enforced by the Next.js middleware (`proxy.ts`).

### 5. Spectator Mode

Spectators view a read-only copy of the game board. They are tracked as a `spectators: Spectator[]` JSONB array on the room row. A separate API endpoint (`POST /api/rooms/[roomId]/spectate`) handles joining as spectator. Spectator choice is permanent. The spectator UI (`SpectatorView.tsx`) mirrors the player view but without an input box, and includes a spectator count badge and live word feed toasts.

### 6. Korean Language Support

The game supports both English and Korean. Match letters are decomposed using the `hangulx` library. Korean dictionary validation enriches definitions with Korean explanations.

---

## Data Flow

```
Client Action → API Route → roomService function → roomDb (read row)
                                                   → GameState reducer (apply mutation)
                                                   → roomDb (persist row)
                                                   → roomBroadcast (realtime event to channel)
                                                   → Client receives and merges via reducer
```

---

## Room Lifecycle

1. **Create**: Host calls `POST /api/rooms` → creates row with random letter, unique invite code, status "waiting"
2. **Join**: Invitee calls `POST /api/rooms/join` with invite code → registered into players array
3. **Start**: Host calls `POST /api/rooms/[roomId]/start` → status → "playing", first turn begins
4. **Play**: Players submit words → validated against dictionary, match letter, used words → turn advances
5. **Leave/Disconnect**: Player leaves → seat marked or compacted; host leaves → room dissolved (archived)
6. **Spectate**: Non-player joins via spectate endpoint → added to spectators array

---

## Key Decisions & Constraints

- **MAX_PLAYERS = 4** fixed (hardcoded in `consts.ts`)
- **Players array is always length 4** — null-padded, typed as `FixedLengthArray<Player | null, 4>`
- **Spectators are unlimited** — no max constraint
- **Spectator choice is permanent** — once a spectator, cannot convert to player
- **Host always auto-joins as player** — no join/spectate choice for host
- **No separate spectator count in DB** — derived from `spectators.length` on the row
- **Spectator count visible to spectators only**, hidden from players
- **Spectator cookie set on spectate** — same pattern as player room cookie
- **Archived rooms blocked from reads** — RLS prevents reading archived rows via `postgres_changes`
- **Cleanup uses debounced effect** — 100ms timeout with cancel, handles React 18 Strict Mode double-mount
