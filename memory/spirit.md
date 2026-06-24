# Spirit

*Why this project exists, who it's for, and the principles behind it.*

---

## What It Is

**End Word** is a multiplayer word-chain game that doubles as a vocabulary trainer. Players take turns submitting words — each word must start with the last letter of the previous word. A timer counts down per turn; when it expires, you die and the game ends. Every word played displays its definition in both English and Korean, turning each round into a micro-lesson for everyone in the room.

---

## Who It's For

Korean learners practicing English, English speakers learning Korean, friends playing together regardless of skill level. The game itself is the draw — competition and fun — but the definitions panel means learning happens whether you're trying to or not.

---

## The User Journey

The experience is built around rooms:

1. **Arrival** — A player lands on the home page, enters their name. In production, a site-wide password gates access (only invited players should create or join rooms). But anyone with a room invite link bypasses the gate — the URL is the key.

2. **Lobby** — The hub. Create a room (name, language, timer duration, public or private) or join by invite code. No accounts, no profiles — just a name and intent.

3. **Waiting** — The host waits as players trickle in. Names appear in the player list. An invite link with a copy button makes sharing easy. The host decides when to start.

4. **Playing** — The game begins. The match letter appears. The timer ticks. Your turn: type a word, submit. If the word is invalid (already used, doesn't match), the UI shows feedback and the timer pauses — no penalty, just try again. A correct word appears in every player's definitions panel — English meaning, Korean translation. Turn passes. Repeat. The chain grows. The rounds advance.

5. **Game Over** — Someone runs out of time. The winner is declared. "Well Done." Back to lobby.

6. **Spectating** — Anyone can watch without playing. They see the current player's perspective, the timer, the word chain building in the definitions panel. Pure observation, pure learning.

---

## Design Principles

**A tool first.** The primary purpose is language practice — the game structure makes it engaging. Every word submitted enriches the shared definitions panel with English meanings and Korean translations. Learning happens through play, not through didactic instruction.

**Low ceremony, fast entry.** No accounts, no profiles, no onboarding. A name and a room. The friction is in the game, not the sign-up.

**Multiplayer is the point.** Solo play works but the intended experience is with others. Competition drives engagement. The social presence — seeing other names, watching their words appear — makes it feel alive.

**The invite URL is the gateway.** In production, site password protects the app from strangers. But an invite link IS the permission slip. Share the URL, bypass the gate. Access is viral, not administered.

**Visible learning.** Every correct submission enriches the shared definitions panel. Words accumulate episode by episode. Even spectators benefit — they can't play, but they can read every definition in the chain.

**Death is instant, but the game may continue.** Timer expires → that player dies. In a 2-player game, that ends it. In larger games, the turn skips over dead players and the game goes on. Clean, dramatic, no health bars to track — you're alive or you're dead.

---

## Current State & Aspiration

The game is playable and stable. The core loop works: create, invite, play, win. But it's unfinished. The GitHub issues describe what's next: accounts, host kick, better disconnect handling, richer end-game screens, solo game stats. The foundation is solid; the polish is the work.

The full catalogue of user flows — explored and unexplored — lives in [`use-cases.md`](use-cases.md).
