# End Word - WIP

Building a prototype game based on 끝말잇기 / word chains.
A multiplayer game where each player has to write a word starting with the last letter of the word submitted by the previous player.

caT > taP > pooL > linK ...

Project is WIP and primarily for learning and experimentation.

## Technologies

I’m using this project to learn:

- **React** + **Next.js**
- **Socket.IO** (real-time multiplayer)
- Designing multiplayer games + UI/UX
- A little bit about **lookup trees** (MARISA trie) for dictionary-style word checks
- This is my **first project** where I’m leveraging **Cursor / AI** for code generation

## Running locally

```bash
npm install
npm run dev
```

Open `http://localhost:4000`.

## Dictionary

There’s a small Python project in `dictionary/` that uses a **MARISA trie** and a FastAPI lookup endpoint (`GET /lookup/{word}`), which the app will call for word validation.

## Testing
Using AI to help me with different kinds of testing:
- Playwright for testing user scenarios
- Vitest for unit tests

```bash
npm run test
```

```bash
npm run test:playwright
```
