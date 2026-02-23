# End Word - WIP

Building a prototype game based on 끝말잇기 / word chains.
A multiplayer game where each player has to write a word starting with the last letter of the word submitted by the previous player.

caT > taP > pooL > linK ...

Project is WIP and primarily for learning and experimentation.

## Technologies / Learning
- **React** + **Next.js**
- **Socket.IO** (real-time multiplayer)
- Designing multiplayer games + UI/UX
- A little bit about **lookup trees** (MARISA trie) for dictionary-style word checks
- **First project** where I’m leveraging **Cursor / AI** for code generation

## Progress
- **Python FASTAPI dictionary service with comprehensive word data**
- **Game supports multiplayer for up to 5 players**
- **Playwright tests + Unittests**

### Game Mechanics
Following game mechanics are working:
- Turn changes on valid word submission
- Health decreases on incorrect word
- Players with 0 lives have their turn skipped

## Running _production_
```bash
npm install
npm run install-python-venv
npm build
npm run prod
```
Open `http://localhost:4000`.

## Running locally
```bash
npm install
npm run dev
```

Open `http://localhost:4000`.

## Dictionary

There’s a small Python project in `dictionary/` that uses a **MARISA trie** and a FastAPI lookup endpoint (`GET /lookup/{word}`), which the app will call for word validation. It parses a large XML dataset of words filters out verbs.

## Testing
Used AI to help setup and build tests:
- Playwright for testing user scenarios
- Vitest for unit tests

```bash
npm run test:playwright
npm run test:playwright:grep <name of test from roomFlowTestNames> // specific test
```

### Dashboard
A HTML visualising the test results can be found under `test-results/dashboard.html`.
```bash
npm run test:all
```

