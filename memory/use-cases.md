# Use Cases

Every observable user flow in the application, organized by category.

> **Keep this file current.** When working on any feature or bug, update the relevant use case with new details — see [rules.md](rules.md) Rule 5.

---

## Explored (Observed Interactively)

### Room Creation & Discovery
- Host creates a public room from the lobby (name, language, timer, private checkbox)
- Host creates a private room (invite code only, not listed publicly)
- Player browses the public room list and joins
- Player joins by entering an invite code in the lobby

### Entry & Access Control
- Authenticated user (has site-access cookie) navigates directly to lobby
- Non-auth user follows an invite link → enters name → room entry choice (join/spectate) — the invite URL bypasses the site password
- Non-auth user tries to access the lobby directly → redirect to site-login (production)
- Player changes display name mid-session via "Change name" nav link

### Gameplay
- Host starts the game after players have joined (or plays solo)
- Player submits a correct word → turn passes, match letter updates, definitions panel grows
- Player submits an invalid word (already used, wrong match letter) → UI error feedback, timer pauses, no penalty
- Player's timer expires → instant death; in 2-player games the game ends; in 3+ player games the turn skips to the next alive player
- Game ends → winner declared → "Well Done" overlay → "Back to lobby"
- During gameplay, players can send emotes (1500ms throttle) visible to everyone
- Current player's partial typing appears as a draft on their PlayerCard for others to see

### Spectating
- Anyone with the room URL can watch a game without playing
- Spectator sees the current player's perspective, timer, word chain building in definitions
- Spectator has no input controls and does not appear in the player list

### Room Lifecycle
- Host copies the invite link from the waiting overlay to share
- Player leaves mid-game via "Exit" → navigates back to lobby
- Host leaves → room dissolves
- Winner clicks "Back to lobby" → returns to lobby

### Learning
- Every correct word appears in the shared definitions panel with English meaning + Korean translation
- Spectators learn passively by watching the word chain and reading definitions
- Players learn from each other's word choices and the definitions they trigger

---

## Unexplored

These are inferred from the codebase but haven't been observed interactively. Each entry describes what should happen and what's worth investigating.

### Emotes in Practice
The emote picker has 8 reactions (hurry, panic, praise, sad, taunt, thinking, etc.). Clicking one broadcasts it via the realtime channel with a 1500ms per-user throttle. Receiving an emote triggers a framer-motion animated banner overlay (scale/rotate/opacity, 2.5s). **Questions**: What does this feel like in a tense game? Can emotes distract or encourage? Does the banner overlap the input area?

### Players Leaving Mid-Match
When a player disconnects or leaves, the host's `useRoomChannel` detects the presence-leave event. **Questions**: In a 2-player game, does the remaining player win immediately? In 3-4 player games, does the turn skip the departed player? Does the PlayerCard update instantly — grey out, show "left" status, or disappear?

### What Losing a Life Looks Like
Timer expiry is instant death, but the visual experience is unknown. **Questions**: Is there any animation — a flash, a shake? Does the dead player's card grey out or show a skull? Does it feel dramatic or muted?

### Joining a Full Room
`MAX_PLAYERS` is 4. **Questions**: What happens when a 5th person tries to join? Error message? Offer to spectate? Does the UI handle this gracefully or throw a raw error?

### Joining a Room Mid-Game
The room entry screen offers "Join as Player" regardless of game status. **Questions**: Joining a "playing" room is gated — only "playing" rooms bypass the site lock for invite paths. What error does a late joiner see? Is it "Game already started" or "Room full"?

### Typing Draft in Multiplayer
The code throttles typing broadcasts at 80ms with a 450ms auto-clear after typing stops. **Questions**: What does it look like on an opponent's PlayerCard to see a partial word forming in real time? Does it build tension or give away too much?

### Timer Sync Edge Cases
When a new spectator joins mid-game, the code broadcasts a timer sync immediately and again 400ms later. **Questions**: What does the spectator's timer bar look like on first render? Does it jump to the correct remaining time, or is there a visible glitch?

### 4-Player Game with Cascading Deaths
With 4 players: one dies → game continues. Then another dies → 1v1. **Questions**: Does the pace feel different at each player count? Is the game more frantic or strategic with more people? Does the UI scale well with 4 PlayerCards?

### Room Dissolution
When the host leaves, the room dissolves. **Questions**: What do other connected players see — an overlay, an automatic redirect, or a frozen screen? Is there a grace period before dissolution?

### Private Room Invite Code Flow
Joining via invite code means typing a UUID, as opposed to clicking a URL. **Questions**: How is the code shared — copied from the lobby creator's screen? Does the private room appear anywhere other than via direct code entry?

### Definitions Panel: Korean vs English Mode
English mode shows rich English definitions with 한국어 설명. **Questions**: In Korean mode, is it Korean definitions with English translations? Or is the panel identical regardless of language? This significantly affects the learning value for each language direction.

### Production Auth Flow
With `SITE_PASSWORD` enabled: landing on the app → redirected to `/site-login` → enter password → receive cookie → redirected to original destination via `returnTo`. Non-auth users clicking an invite link skip this entirely. **Questions**: What does someone experience trying to reach `/lobby` without the password? Is the redirect smooth, or is there a flash of the lobby before the redirect fires?
