# Meta

> *How this harness was built, why it's structured this way, and how to maintain it.*

---

## Origin

This memory folder was created by converting 65+ opencode chat sessions (spanning ~3 months of development) into structured project documentation. The goal was to give future AI agents a ~2K-token entry point that orients them instantly, with on-demand deep dives into architecture, conventions, decisions, and use cases.

---

## File Dependency Chain

```
_INDEX.md  ←── entry point (~2K tokens). Route to other files based on task.
  ├── spirit.md          — purpose, philosophy, user journey
  ├── use-cases.md       — all user flows, explored + unexplored
  ├── rules.md           — hard constraints before touching code
  ├── architecture.md    — full system architecture (400 lines)
  ├── agent-notes.md     — conventions, gotchas, patterns for agents
  ├── decisions.md       — dated decision log with rationale
  ├── glossary.md        — project-specific terminology
  ├── features.md        — implementation status of features
  ├── tech-debt.md       — known issues with severity tracking
  ├── current-work.md    — active branch, focus, next steps
  ├── task-to-files.md   — "I want to X → read Y, edit Z" mappings
  └── audit.md           — post-change verification checklist
meta.md                  — this file (not linked from _INDEX)
```

**Principle**: `_INDEX.md` is always read first. Everything else is load-on-demand. No file assumes you've read any other file except `_INDEX.md` and `rules.md`.

---

## Design Decisions

1. **Single entry point**. Early iterations had no index — agents had to read 8 files just to start. `_INDEX.md` collapses orientation into under 100 lines.

2. **Rules vs Notes vs Decisions**. Hard constraints (`rules.md`) are separate from conventions (`agent-notes.md`) and rationale (`decisions.md`). Rules are non-negotiable; notes are advisory; decisions are historical.

3. **Gotchas aren't triplicated**. Originally the same gotchas appeared in `_INDEX.md`, `architecture.md`, and `agent-notes.md`. Now `_INDEX.md` has 5 short summaries, `agent-notes.md` has the canonical 18-item full list, and `architecture.md` points to it.

4. **Use cases live separately from spirit**. `use-cases.md` is a living catalogue (updated per Rule 5). `spirit.md` is a stable philosophy document. They serve different update cadences.

5. **Evidence-based writing enforced by Rule 6**. Without it, agents write claims from memory — e.g., "useTimer dispatches tickTimer" when the code actually uses `useCountdown` from `react-timer-hook`. Rule 6 requires source verification.

6. **Audit is a checklist, not a script (yet)**. A `scripts/audit-memory.sh` would catch mechanical errors automatically. The current `audit.md` relies on agent discipline. This is a known future improvement.

7. **`task-to-files.md` was built from session data**. Every entry maps to actual file paths consulted in real sessions, not theoretical ideal paths.

---

## Maintenance Notes

- **When adding a memory file**: add it to the "Which File to Load Next" table in `_INDEX.md`, run `audit.md`.
- **When changing a hook name or file path**: grep the entire `memory/` folder and update every reference.
- **When a feature goes from "In Progress" to "Done"**: update `features.md` and check if `current-work.md` needs updating.
- **When `use-cases.md` gets a new entry**: check if it affects `spirit.md` (new user journey stages) or `architecture.md` (new code paths).
- **Rule 6 anti-pattern**: never write "X is no longer used" or "Y replaces Z" without grepping the entire codebase for X and confirming Z is the active consumer.
