# Audit

> Run through this checklist after any session where memory files were created or modified. Keeps the harness from rotting.

---

## Source Verification

For each claim written to a memory file, answer:

- [ ] **Did I read the actual source file** before writing the claim, or did I write it from memory?
- [ ] **Do import paths match?** Open each file referenced and check its import block matches what was claimed.
- [ ] **Is any file path stale?** Grep for the file name — does it actually exist at that location?
- [ ] **Are function/hook/component names current?** Check the current codebase, not a prior version.
- [ ] **For any "no longer used" claim**: is the thing genuinely unused, or just unused in the one file I read? Grep the whole codebase.
- [ ] **For any "replaced by X" claim**: did I confirm X is the active replacement? Read the imports of the consumer file.

---

## Cross-File Consistency

- [ ] **No contradictions**: If `decisions.md` says "uses CSS transition" and `architecture.md` says "uses @keyframes", one is wrong. Cross-check any technical claim appearing in multiple files.
- [ ] **No triplicated gotchas**: The same gotcha should not appear fully expanded in `_INDEX.md`, `architecture.md`, AND `agent-notes.md`. `_INDEX.md` has short summaries; `agent-notes.md` has the canonical full version.
- [ ] **`_INDEX.md` quick-ref table is current**: Every file path in the Quick-Ref table actually exists and is the active implementation.
- [ ] **`_INDEX.md` "Which File to Load Next" table is complete**: Every memory file has an entry.

---

## Deduplication & Freshness

- [ ] **No duplicate entries** in any list or table (check `features.md`, `glossary.md` especially).
- [ ] **No stale statuses**: `features.md` entries marked "In Progress" or with branch references — are those branches merged? Is it actually Done now?
- [ ] **No stale version references**: Dates, commit SHAs, branch names — are they still accurate?
- [ ] **`current-work.md` reflects reality**: Branch, focus, blockers aren't from weeks ago.

---

## Post-Change Sanity Check

After changes to memory files:

- [ ] Run `git diff` on the `memory/` directory. Skim every changed line. Does anything look wrong at a glance?
- [ ] If a hook name, file path, or import was changed in one file, was it changed everywhere else it appears (cross-reference with grep)?

---

## Resolving Findings

When you find an issue during audit:

1. Fix it immediately — don't defer.
2. If you're uncertain whether something is correct, mark it `[unverified]` rather than guessing.
3. Remove claims you cannot verify rather than leaving potentially wrong information.
4. After fixing, re-run the relevant checklist items.
