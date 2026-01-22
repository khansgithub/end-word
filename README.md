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
- **Provides a dictionary endpoint which queries a large dataset of korean words**
- **Hosts a basic worflow, from landing page, to player room page**
- **Implments funamental game mechanics of submitting a word and turn rotation**
- **Provides strong client / server communication thorugh Socket.io**
  - Currently refactoring this, requirements for the client/server architecture become clear the futher this progresses, which often warrants rethinking the initial design.
  - The client only event requests state from the server
  - Focusing on strong type-saftey, which requires have a clear understanding of all the use cases
- **Strong end-to-end and unittests**
  - Tests need to be updated however the current framework provides strong startpoint - tests were generated mostly with AI.

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
