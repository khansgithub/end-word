# Glossary

| Term | Definition |
|------|------------|
| **Site Lock** | Global password gate protecting the entire app. Controlled by `SITE_PASSWORD` env var. Users must enter the password on `/site-login` to receive `end-word-site-access` cookie. |
| **Room Invite Bypass** | Mechanism allowing invitees to join a playing room without knowing the site password. Specific paths (`/room/:id`, `/api/rooms/join`, GET `/api/rooms/:id`) pass through site lock if the target room is in "playing" status. |
| **Proxy** | Route handler (`src/proxy.ts`) that replaces Next.js middleware. Intercepts every request to enforce site lock and room invite access rules. |
| **GameStateEmit** | Serialized game state sent from server to clients via Supabase Realtime broadcast. Contains full game state minus client-local fields. |
| **GameStateClient** | Local client-side game state derived by merging `GameStateEmit` with client-specific fields (`thisPlayer`, `timeRemaining`). |
| **GameContainer** | Main client-side orchestrator component (`src/app/components/game/GameContainer.tsx`). Thin wrapper that wires `useJoinRoom`, `useLeaveRoom`, and renders GameV2 or SpectatorView based on mode. |
| **GameV2** | Active gameplay layout component (`src/app/components/game/GameV2.tsx`). Renders input, timer, player cards, overlays, definitions panel. |
| **Auth Path** | Routes exempt from site lock: `/site-login`, `/api/site-auth`, `/api/dictionary/*`. |
| **End Word** | The game name. A Korean 끝말잇기 (word-chain) game supporting both Korean and English word chains. |
| **returnTo** | URL query parameter pattern for post-login redirect. Sanitized via `sanitizeReturnTo()` to prevent open redirect attacks. Only allows `/lobby` and `/room/` prefixed paths. |
| **brace expansion** | Shell-style pattern syntax required by Vercel's `includeFiles` config. E.g., `{dict.marisa,metadata.jsonl}` selects both files. |
| **busy overlay** | `BusyOverlay.tsx` — Full-screen translucent overlay with spinner and message shown during async operations (creating room, joining room, starting game). |
| **tickTimer** | Reducer action dispatched by `useTimer` every 1 second during gameplay. Decrements `timeRemaining` on the current turn player. The reducer handles auto-kill when timer reaches 0. |
| **gameStateRef** | `MutableRefObject<GameStateClient>` pattern used to pass current state into hooks/callbacks without stale closure issues. Updated every render via `useEffect`. |
| **presence tracking** | Supabase Realtime feature that tracks which clients are connected to a channel. Used by host to detect when players disconnect, and to auto-remove them from the game state. |
| **MOCK_SUPABASE** | Environment flag (`MOCK_SUPABASE=true` or `NEXT_PUBLIC_MOCK_SUPABASE=true`) that enables in-process mock Supabase. Disables site lock and replaces real database/Realtime with mock implementations for offline development and testing. |
| **stale closure** | React anti-pattern where a callback function captures a variable value from render time, and later uses that stale value instead of the current one. Mitigated with refs (`useRef`). |
| **PlayFocusPanel** | Primary gameplay area component showing the timer bar, round/word status, and word input field for the current player. |
| **PlayersRoster** | Horizontal/vertical list of PlayerCard components showing all players in the room with their status, health, and timer. |
| **createLogger** | Factory function exported by `@/lib/client/logging`. Returns a pre-prefixed logger: `const logger = createLogger("ModuleName")`. Supports `debug()`, `info()`, `error()` with auto-prefix and optional structured data. |
| **DomEntry** | TypeScript type in `tests/e2e/room-flow.spec.ts` representing pre-configured Playwright locators for game UI elements. Created by `setupPages()`. |
| **EmotePayload** | `{ userId, seat, emoteId, timestamp }` — broadcast when a player sends an emoji reaction. Rendered by `EmoteBanner.tsx` with framer-motion animation. |
| **TypingDraftPayload** | `{ userId, seat, draft, timestamp }` — broadcast at 80ms intervals while the active player is typing. Rendered as `typingDraft` in PlayerCard. |
| **TimerSyncPayload** | `{ remaining, paused }` — broadcast by host to sync timer state across clients. Clients can also request sync via `timerSyncRequest`. |
| **LogLayer** | Third-party logging library (`loglayer` npm package) used in hooks and room API client. Provides `withPrefix()`, `withMetadata()`, and structured transport via `ConsoleTransport`. |
| **BoolMap** | Binary decision tree pattern in `player-util.ts` mapping boolean conditions (turn, isCurrentPlayer, hasPlayer) to CSS values for PlayerCard styling. |
| **Hangul FSM** | Finite state machine in `fsm.txt` + `input-validation.ts` for Korean syllable composition validation. States: S0 → S_ㄱ → S_가 → S_강 → S_값. |
| **roomAccessCookie** | Per-room cookie (`end-word-room-${roomId}`) set on join and cleared on leave, allowing non-auth guests to access a specific room. |
| **resolveGameStatus** | State machine function in `gameStatus.ts` that determines game status transitions (waiting→playing→finished→dissolved) based on player counts, health, and game state. |
