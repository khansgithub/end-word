# End Word

A small **multiplayer word-chain game** prototype built to learn:

- **React + Next.js (App Router)** UI patterns and state management
- **Socket.IO** for real-time multiplayer
- **Designing multiplayer game loops** (turn-taking, sync, validation, reconnection)
- A bit of **dictionary / lookup-tree** work using a **MARISA trie** (Python side project)

The UI is titled **“End Word”** and is currently set up for **Hangul-friendly input** (IME composition handling + syllable decomposition utilities).

## What you do in the game

- Enter a name on the home screen and join the room.
- Players take turns submitting a word that **starts with the current match syllable**.
- The **last syllable** of the submitted word becomes the next match syllable for the next player.

There are hooks for dictionary validation, but in the current code path word validation is **temporarily bypassed for dev** (see `src/shared/utils.ts` `inputIsValid()`).

## Tech stack

- **Next.js** (App Router) in `src/app/`
- **React 19**
- **Express** custom server (hosts Next + other endpoints)
- **Socket.IO** (server + client)
- **Zustand** for small client-side stores (`src/app/store/`)
- **Tailwind + daisyUI** for styling
- **Vitest** (unit tests) + **Playwright** (e2e)
- **MSW** for test/dev mocking of dictionary endpoints

## Repo tour

- **`src/app/`**: Next.js UI (home screen, room, game UI)
  - `src/app/components/Homescreen.tsx`: join flow + socket bootstrap
  - `src/app/components/GameContainer.tsx`: registers player via socket
  - `src/app/components/Game.tsx`: main gameplay UI (match letter, input, players)
  - `src/app/components/InputBox.tsx`: Hangul-aware input + validation feedback
  - `src/app/dictionary/word/[word]/route.ts`: Next route that proxies dictionary lookup
- **`src/server/`**: custom Node server + socket setup
  - `src/server/server.ts`: Express + Next server entrypoint
  - `src/server/socket.ts`: Socket.IO wiring for the Node server
  - `src/server/metrics.ts`: Prometheus metrics (`/metrics`)
- **`src/shared/`**: shared types + game logic used by both client/server
  - `src/shared/GameState.ts`: reducer + game state helpers
  - `src/shared/socket.ts`: canonical event names
  - `src/shared/socketClient.ts`: client listeners for server-pushed state
  - `src/shared/socketHandlers.ts` + `src/shared/socketServer.ts`: newer/structured server handler code (mutex + broadcast helpers; still WIP/integration)
- **`dictionary/`**: Python experiments for fast dictionary lookup using **MARISA trie**
  - `dictionary/build_trie.py`: parse XML data → build `dict.marisa` + `metadata.jsonl`
  - `dictionary/load_trie.py`: load trie + metadata and expose lookup methods
  - `dictionary/main.py`: FastAPI service exposing `GET /lookup/{word}`

## Running locally

### Prereqs

- Node.js + npm

### Start the dev server

This repo uses a **custom server entrypoint** (Express + Next) so the default port is **4000**.

```bash
npm install
npm run dev
```

Then open `http://localhost:4000`.

You can change the port with `PORT=3000 npm run dev` (the server reads `process.env.PORT`).

## Optional: dictionary validation service (Python)

The Next route `GET /dictionary/word/:word` calls `src/shared/api.ts`, which fetches from a local FastAPI service at `http://localhost:8000/lookup/:word`.

To run the Python service:

```bash
cd dictionary
python -m venv .venv
source .venv/bin/activate

# If you prefer, install only what you need instead of the full requirements file:
pip install fastapi uvicorn marisa-trie orjson

python main.py
```

Notes:

- The trie file is expected at `dictionary/data/dict.marisa` with metadata at `dictionary/data/metadata.jsonl`.
- To rebuild those artifacts from the XML files in `dictionary/data/*.xml`, run:

```bash
cd dictionary
python build_trie.py
```

## Testing

- **Unit tests**:

```bash
npm run test
```

- **E2E tests (Playwright)**:

```bash
npm run test:playwright
```

- **Run all tests (Vitest JSON + Playwright JSON)**:

```bash
npm run test:all
```

## MSW mocking

Mock Service Worker is set up to stub dictionary lookups in tests/dev:

- Worker script: `public/mockServiceWorker.js`
- Handlers: `src/mocks/handlers.ts` (stubs both `/dictionary/word/:word` and `http://localhost:8000/lookup/:word`)
- Node test server utilities: `src/mocks/test-server.ts`

## State synchronization notes

There’s an architectural note in `STATE_SYNC_IMPLEMENTATION.md` describing a **server-authoritative** model where clients submit actions and the server broadcasts `gameStateUpdate`.

The codebase currently contains both:

- a simpler socket handler path in `src/server/` (used by `src/server/socket.ts`), and
- a more structured handler implementation in `src/shared/socketHandlers.ts` / `src/shared/socketServer.ts`.

If you’re reading the project to learn, treat the shared handler approach as the “direction of travel” and the server handler as the current wired implementation.

## Observability

- `GET /metrics` exposes Prometheus metrics via `prom-client` (see `src/server/metrics.ts`).
