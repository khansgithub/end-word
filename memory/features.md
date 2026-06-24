# Features

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Timer bar above word input (PlayFocusPanel) | Done | — | Configurable duration via lobby slider; CSS transition on width |
| Opponent timer in PlayerCard compact mode | Done | — | Mini timer bar per opponent; synced via broadcast |
| `killPlayerAndNextTurn` atomic reducer action | Done | — | Merged kill + turn advancement in single dispatch |
| Reducer-based `tickTimer` (removed local ref timer) | Done | — | Timer state managed in GameState reducer for single source of truth |
| Host auto-removes disconnected players | Done | — | Presence-leave detection with gameStateRef verification |
| `router.push` fallback to `window.location.href` | Done | — | 100ms timeout fallback for Vercel production reliability |
| `NEXT_PUBLIC_MOCK_SUPABASE` client-side mock flag | Done | — | Site lock auto-disabled in mock mode; `gameStateUpdate` allowed in mock broadcast |
| Site password lock extended to API endpoints | Done | — | Join, room GET, room info gated with room invite bypass for playing rooms |
| `checkSiteAccess()` server-side auth function | Done | — | Cookie-based site access check reusable across API routes |
| Korean + English word chain gameplay | Done | — | Dual language support via `GameLanguage` type ("ko" \| "en") |
| Dictionary definitions panel | Done | — | Real-time definition display with English meanings + Korean translations |
| Spectator mode | Done | — | `SpectatorView.tsx`, spectate API route, proxy bypass |
| Room invite codes | Done | — | UUID invite codes; bypass site lock for playing rooms |
| Cleanup stale rooms | Done | — | SQL function: 30 min idle or 0 players |
| Configurable timer duration per room | Done | — | Passed from lobby through room creation API |
| Structured client logging (logger.debug/info/error) | Done | — | `@/lib/client/logging` with level filtering; server buffer (500 entries) |
| Click-to-copy invite link in waiting overlay | Done | — | `navigator.clipboard.writeText()` on invite URL in GameOverlay |
| Player list in waiting room overlay | Done | — | Active player names displayed below spinner in waiting popup |
| useJoinRoom / useLeaveRoom hooks | Done | — | Extracted from GameContainer; `useLeaveRoom` handles tab close + Strict Mode |
| TimerBar animation driven by remainingSeconds | Done | — | CSS `@keyframes shrink-width` with duration set to actual remaining time |
| Word submission includes client countdown in POST | Done | — | Server updates `timeRemaining` for submitting player before broadcast |
| useCountdown via react-timer-hook useStopwatch | Done | — | Pausable per-player countdown; starts on "playing", pauses via `isPaused` |
| ThemeToggle integrated into AppNav | Done | — | Moved from layout.tsx to AppNav bar + AppShell standalone fallback |
| Consistent overlay modal min-dimensions | Done | — | All overlay modals share `min-w-[22rem] max-w-md` |
| Emote banner (animated emoji reactions) | Done | — | `EmoteBanner.tsx` + `EmotePayload` type |
| Emote picker (8 emote options with rate limiting) | Done | — | 1500ms throttle; hurray, panic, praise, sad, taunt, thinking |
| Real-time typing draft broadcast | Done | — | 80ms throttle, 450ms clear delay; typed text visible to spectators/opponents |
| Timer sync protocol (host broadcast + client request) | Done | — | `timerSync.ts` two-event protocol via Supabase Realtime |
| Full in-process mock Supabase | Done | — | 6 mock modules + 4 API routes; SSE-based realtime simulation |
| Hangul input validation FSM | Done | — | `input-validation.ts` + `hangul-decomposer.ts` + `fsm.txt` |
| `InputBox` with internal Zustand store | Done | — | Module-level imperative API: focusInputBox, getInputValue, resetInput, setInputError |
| Per-room access cookie (`roomAccessCookie`) | Done | — | `end-word-room-${roomId}` set on join, cleared on leave |
| `gameStatus.ts` state machine | Done | — | `resolveGameStatus()` determines status transitions |
