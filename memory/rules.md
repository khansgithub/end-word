# Rules

Hard constraints. No exceptions without explicit approval.

---

## R1: Never import server code into client components

`src/app/server/` contains server-only modules (env loading with `dotenv`, Supabase admin clients, `crypto.subtle`). Importing any into a `"use client"` component or `src/shared/` module either leaks secrets to the browser bundle or fails at runtime.

**Server-only files**: `src/lib/site-lock.ts`, `src/app/server/game/roomService.ts`, `src/app/server/game/roomDb.ts`, `src/app/server/game/roomBroadcast.ts`, `src/app/server/env.ts`, `src/app/server/logging.ts`, `src/app/server/supabase/server.ts`, `src/app/server/supabase/admin.ts`, `src/app/server/supabase/middleware.ts`.

**Shared values** that both sides need go in `src/shared/` (e.g. `src/shared/site-lock.ts`, `src/shared/consts.ts`, `src/shared/types.ts`).

---

## R2: Prefer existing state patterns before creating a new store

Two Zustand stores exist: `userStore` (`src/app/store/userStore.ts`) and `useInputStore` (inside `src/app/components/game/InputBox.tsx`, accessed via module-level imperative functions: `focusInputBox()`, `getInputValue()`, `resetInput()`, `setInputError()`).

The established cross-component state pattern is `useRef` + `MutableRefObject` (the `gameStateRef` pattern) passed through props.

If considering a new Zustand store, first check whether `userStore` or `gameStateRef` can serve. If not, scope the new store narrowly and place it in `src/app/store/`.

---

## R3: Always gate new broadcast events in the mock allowlist

Every realtime broadcast event (e.g. `EMOTE_EVENT`, `TYPING_DRAFT_EVENT`, `TIMER_SYNC_EVENT`) must be added to `ALLOWED_EVENTS` in `src/app/api/mock-supabase/broadcast/route.ts`. Without this, developers using `MOCK_SUPABASE=true` cannot receive the event, creating a silent gap between dev and production.

Also ensure the new event is handled in `useRoomChannel.ts` for client-side reception.

---

## R4: Always type new environment variables in `env.d.ts`

`src/app/env.d.ts` defines the `NodeJS.ProcessEnv` interface with JSDoc descriptions. Any new env var added to `.env`, `.env.prod`, Vercel environment, or accessed via `envGet()` must have a corresponding typed entry.

Notable vars still untyped and should be added: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SITE_PASSWORD`, `NODE_ENV`.

## R5: Keep `use-cases.md` up to date

When working on any feature or bug that touches a user flow, update [`use-cases.md`](use-cases.md) afterward:

- If the use case is already listed under **Explored** — add any new edge cases, outcomes, or visual behaviors discovered.
- If listed under **Unexplored** and you've now observed it — move it to **Explored** and document what actually happened (not just what was inferred).
- If entirely new — add it to the appropriate category with details.

## R6: Memory files must be evidence-based, not assumed

Before writing any claim in a memory file (`memory/*.md`), verify it against the actual source code:

- **File paths** — does the file exist at that exact path? Open it and check.
- **Imports** — does the file actually import what you're claiming? Read the import block.
- **Function names / patterns** — are they spelled correctly and current? Grep the codebase.
- **"X is no longer used" / "Y replaces Z"** — verify both sides of the claim are true in the current code.

If you cannot verify a claim from source, either omit it or mark it with `[unverified]`. Never write a fact about the code from memory or from another memory file without checking the source.
